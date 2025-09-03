from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
import uuid
import os
from enum import Enum
import asyncio

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/supreme_fitness')
SECRET_KEY = "supreme_fitness_secret_key_2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# PayPal Configuration
PAYPAL_CLIENT_ID = "AYA7mRHI-QvYo5SVaMYW_kcqcNzlM-LydGQgwViOcSmoiVpDg8oRg1nHbRzs-YYXJvJFbB7V6Sz9xhb4"
PAYPAL_SECRET = "EHYiGd1-s7vxIpxkb7qbl5IJqNWEF9qEK9bEQ2T4HewE00I5zsxsSTB89eDBtWrOLomuWMVdn3pbgJ2G"

app = FastAPI(title="Supreme Fitness Gym API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client.supreme_fitness

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    MEMBER = "member"
    TRAINER = "trainer"
    ADMIN = "admin"

class ClassStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class BookingStatus(str, Enum):
    BOOKED = "booked"
    CANCELLED = "cancelled"
    ATTENDED = "attended"
    NO_SHOW = "no_show"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

# Pydantic Models
class UserBase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    date_joined: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    is_approved: bool = False

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserBase

class GymClass(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    trainer_id: str
    trainer_name: str
    start_time: datetime
    end_time: datetime
    duration: int  # minutes
    capacity: int
    price: float
    status: ClassStatus = ClassStatus.ACTIVE
    enrolled_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClassCreate(BaseModel):
    name: str
    description: str
    trainer_id: str
    start_time: datetime
    end_time: datetime
    capacity: int
    price: float

class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_id: str
    member_name: str
    class_id: str
    class_name: str
    class_start_time: datetime
    booking_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: BookingStatus = BookingStatus.BOOKED
    payment_status: PaymentStatus = PaymentStatus.PENDING
    payment_id: Optional[str] = None

class BookingCreate(BaseModel):
    class_id: str

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    booking_id: Optional[str] = None
    amount: float
    payment_type: str  # "class_booking", "membership"
    paypal_order_id: Optional[str] = None
    status: PaymentStatus = PaymentStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class Progress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_id: str
    weight: Optional[float] = None
    height: Optional[float] = None  # in cm
    bmi: Optional[float] = None
    attendance_count: int = 0
    recorded_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProgressUpdate(BaseModel):
    weight: Optional[float] = None
    height: Optional[float] = None

class Feedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_id: str
    member_name: str
    trainer_id: Optional[str] = None
    class_id: Optional[str] = None
    rating: int  # 1-5
    comment: str
    feedback_type: str  # "trainer", "class"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FeedbackCreate(BaseModel):
    trainer_id: Optional[str] = None
    class_id: Optional[str] = None
    rating: int
    comment: str
    feedback_type: str

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str  # "booking", "class_update", "payment", "general"
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def calculate_bmi(weight: float, height: float) -> float:
    height_m = height / 100  # Convert cm to meters
    return round(weight / (height_m ** 2), 2)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return UserBase(**user)

async def create_notification(user_id: str, title: str, message: str, notification_type: str):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type
    )
    await db.notifications.insert_one(notification.dict())

# Auth endpoints
@app.post("/api/register", response_model=UserBase)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = UserBase(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        phone=user_data.phone,
        is_approved=user_data.role in [UserRole.MEMBER, UserRole.ADMIN]  # Auto-approve members and admins
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Create notification for admin if trainer/staff registration
    if user_data.role in [UserRole.TRAINER]:
        admin_users = await db.users.find({"role": UserRole.ADMIN}).to_list(length=None)
        for admin in admin_users:
            await create_notification(
                admin["id"],
                "New Registration Pending",
                f"New {user_data.role} registration: {user_data.full_name}",
                "registration"
            )
    
    return user

@app.post("/api/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["is_active"]:
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    if not user["is_approved"]:
        raise HTTPException(status_code=401, detail="Account pending approval")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    
    user_obj = UserBase(**user)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_obj
    )

# User management endpoints
@app.get("/api/users", response_model=List[UserBase])
async def get_users(current_user: UserBase = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find().to_list(length=None)
    return [UserBase(**user) for user in users]

@app.put("/api/users/{user_id}/approve")
async def approve_user(user_id: str, current_user: UserBase = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.users.update_one({"id": user_id}, {"$set": {"is_approved": True}})
    
    # Notify user
    user = await db.users.find_one({"id": user_id})
    if user:
        await create_notification(
            user_id,
            "Account Approved",
            "Your account has been approved. You can now access all features.",
            "approval"
        )
    
    return {"message": "User approved successfully"}

@app.put("/api/users/{user_id}/deactivate")
async def deactivate_user(user_id: str, current_user: UserBase = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    return {"message": "User deactivated successfully"}

# Class management endpoints
@app.post("/api/classes", response_model=GymClass)
async def create_class(class_data: ClassCreate, current_user: UserBase = Depends(get_current_user)):
    if current_user.role not in [UserRole.TRAINER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Trainer or Admin access required")
    
    # Get trainer info
    trainer = await db.users.find_one({"id": class_data.trainer_id})
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    
    gym_class = GymClass(
        name=class_data.name,
        description=class_data.description,
        trainer_id=class_data.trainer_id,
        trainer_name=trainer["full_name"],
        start_time=class_data.start_time,
        end_time=class_data.end_time,
        duration=int((class_data.end_time - class_data.start_time).total_seconds() / 60),
        capacity=class_data.capacity,
        price=class_data.price
    )
    
    await db.classes.insert_one(gym_class.dict())
    return gym_class

@app.get("/api/classes", response_model=List[GymClass])
async def get_classes(current_user: UserBase = Depends(get_current_user)):
    classes = await db.classes.find({"status": ClassStatus.ACTIVE}).to_list(length=None)
    return [GymClass(**cls) for cls in classes]

@app.get("/api/classes/trainer/{trainer_id}", response_model=List[GymClass])
async def get_trainer_classes(trainer_id: str, current_user: UserBase = Depends(get_current_user)):
    classes = await db.classes.find({"trainer_id": trainer_id}).to_list(length=None)
    return [GymClass(**cls) for cls in classes]

# Booking endpoints
@app.post("/api/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, current_user: UserBase = Depends(get_current_user)):
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Member access required")
    
    # Get class info
    gym_class = await db.classes.find_one({"id": booking_data.class_id})
    if not gym_class:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Check if class is full
    if gym_class["enrolled_count"] >= gym_class["capacity"]:
        raise HTTPException(status_code=400, detail="Class is full")
    
    # Check if already booked
    existing_booking = await db.bookings.find_one({
        "member_id": current_user.id,
        "class_id": booking_data.class_id,
        "status": BookingStatus.BOOKED
    })
    if existing_booking:
        raise HTTPException(status_code=400, detail="Already booked for this class")
    
    booking = Booking(
        member_id=current_user.id,
        member_name=current_user.full_name,
        class_id=booking_data.class_id,
        class_name=gym_class["name"],
        class_start_time=gym_class["start_time"]
    )
    
    await db.bookings.insert_one(booking.dict())
    
    # Update class enrolled count
    await db.classes.update_one(
        {"id": booking_data.class_id},
        {"$inc": {"enrolled_count": 1}}
    )
    
    # Create notification
    await create_notification(
        current_user.id,
        "Booking Confirmed",
        f"Successfully booked {gym_class['name']} class",
        "booking"
    )
    
    return booking

@app.get("/api/bookings/member", response_model=List[Booking])
async def get_member_bookings(current_user: UserBase = Depends(get_current_user)):
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Member access required")
    
    bookings = await db.bookings.find({"member_id": current_user.id}).to_list(length=None)
    return [Booking(**booking) for booking in bookings]

@app.put("/api/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, current_user: UserBase = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["member_id"] != current_user.id and current_user.role not in [UserRole.TRAINER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": BookingStatus.CANCELLED}}
    )
    
    # Update class enrolled count
    await db.classes.update_one(
        {"id": booking["class_id"]},
        {"$inc": {"enrolled_count": -1}}
    )
    
    # Create notification
    await create_notification(
        booking["member_id"],
        "Booking Cancelled",
        f"Your booking for {booking['class_name']} has been cancelled",
        "booking"
    )
    
    return {"message": "Booking cancelled successfully"}

# Progress tracking endpoints
@app.post("/api/progress", response_model=Progress)
async def create_progress_entry(progress_data: ProgressUpdate, current_user: UserBase = Depends(get_current_user)):
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Member access required")
    
    # Calculate BMI if both weight and height provided
    bmi = None
    if progress_data.weight and progress_data.height:
        bmi = calculate_bmi(progress_data.weight, progress_data.height)
    
    # Get current attendance count
    attended_bookings = await db.bookings.count_documents({
        "member_id": current_user.id,
        "status": BookingStatus.ATTENDED
    })
    
    progress = Progress(
        member_id=current_user.id,
        weight=progress_data.weight,
        height=progress_data.height,
        bmi=bmi,
        attendance_count=attended_bookings
    )
    
    await db.progress.insert_one(progress.dict())
    return progress

@app.get("/api/progress/member", response_model=List[Progress])
async def get_member_progress(current_user: UserBase = Depends(get_current_user)):
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Member access required")
    
    progress_records = await db.progress.find({"member_id": current_user.id}).sort("recorded_date", -1).to_list(length=None)
    return [Progress(**record) for record in progress_records]

# Feedback endpoints
@app.post("/api/feedback", response_model=Feedback)
async def create_feedback(feedback_data: FeedbackCreate, current_user: UserBase = Depends(get_current_user)):
    if current_user.role != UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Member access required")
    
    feedback = Feedback(
        member_id=current_user.id,
        member_name=current_user.full_name,
        trainer_id=feedback_data.trainer_id,
        class_id=feedback_data.class_id,
        rating=feedback_data.rating,
        comment=feedback_data.comment,
        feedback_type=feedback_data.feedback_type
    )
    
    await db.feedback.insert_one(feedback.dict())
    
    # Notify trainer if feedback is for them
    if feedback_data.trainer_id:
        await create_notification(
            feedback_data.trainer_id,
            "New Feedback Received",
            f"You received a {feedback_data.rating}-star rating from {current_user.full_name}",
            "feedback"
        )
    
    return feedback

@app.get("/api/feedback/trainer/{trainer_id}", response_model=List[Feedback])
async def get_trainer_feedback(trainer_id: str, current_user: UserBase = Depends(get_current_user)):
    feedback_records = await db.feedback.find({"trainer_id": trainer_id}).sort("created_at", -1).to_list(length=None)
    return [Feedback(**record) for record in feedback_records]

# Payment endpoints
@app.post("/api/payments/create-order")
async def create_payment_order(booking_id: str, current_user: UserBase = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    gym_class = await db.classes.find_one({"id": booking["class_id"]})
    if not gym_class:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Create payment record
    payment = Payment(
        user_id=current_user.id,
        booking_id=booking_id,
        amount=gym_class["price"],
        payment_type="class_booking"
    )
    
    await db.payments.insert_one(payment.dict())
    
    # Return PayPal order details (simplified for demo)
    return {
        "order_id": payment.id,
        "amount": payment.amount,
        "paypal_client_id": PAYPAL_CLIENT_ID
    }

@app.post("/api/payments/{payment_id}/complete")
async def complete_payment(payment_id: str, paypal_order_id: str, current_user: UserBase = Depends(get_current_user)):
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Update payment status
    await db.payments.update_one(
        {"id": payment_id},
        {
            "$set": {
                "status": PaymentStatus.COMPLETED,
                "paypal_order_id": paypal_order_id,
                "completed_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Update booking payment status
    if payment["booking_id"]:
        await db.bookings.update_one(
            {"id": payment["booking_id"]},
            {"$set": {"payment_status": PaymentStatus.COMPLETED, "payment_id": payment_id}}
        )
    
    # Create notification
    await create_notification(
        current_user.id,
        "Payment Successful",
        f"Payment of ${payment['amount']} completed successfully",
        "payment"
    )
    
    return {"message": "Payment completed successfully"}

# Notification endpoints
@app.get("/api/notifications", response_model=List[Notification])
async def get_notifications(current_user: UserBase = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": current_user.id}).sort("created_at", -1).to_list(length=None)
    return [Notification(**notification) for notification in notifications]

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: UserBase = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"is_read": True}}
    )
    return {"message": "Notification marked as read"}

# Analytics endpoints (Admin only)
@app.get("/api/analytics/dashboard")
async def get_dashboard_analytics(current_user: UserBase = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get various counts and metrics
    total_members = await db.users.count_documents({"role": UserRole.MEMBER, "is_active": True})
    total_trainers = await db.users.count_documents({"role": UserRole.TRAINER, "is_active": True})
    total_classes = await db.classes.count_documents({"status": ClassStatus.ACTIVE})
    total_bookings = await db.bookings.count_documents({"status": BookingStatus.BOOKED})
    
    # Revenue calculation
    completed_payments = await db.payments.find({"status": PaymentStatus.COMPLETED}).to_list(length=None)
    total_revenue = sum(payment["amount"] for payment in completed_payments)
    
    return {
        "total_members": total_members,
        "total_trainers": total_trainers,
        "total_classes": total_classes,
        "total_bookings": total_bookings,
        "total_revenue": total_revenue,
        "pending_approvals": await db.users.count_documents({"is_approved": False})
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)