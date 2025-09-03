#!/usr/bin/env python3
"""
Supreme Fitness Gym Backend API Testing Suite
Tests all backend endpoints with role-based authentication
"""

import requests
import json
from datetime import datetime, timedelta, timezone
import time

# Configuration
BASE_URL = "https://gymhub-16.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def log_success(self, test_name):
        print(f"✅ {test_name}")
        self.passed += 1
        
    def log_failure(self, test_name, error):
        print(f"❌ {test_name}: {error}")
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n=== TEST SUMMARY ===")
        print(f"Total Tests: {total}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        if self.errors:
            print("\nFailed Tests:")
            for error in self.errors:
                print(f"  - {error}")

# Global test results
results = TestResults()

# Test data storage
test_users = {}
test_classes = {}
test_bookings = {}
test_payments = {}

def make_request(method, endpoint, data=None, headers=None, token=None):
    """Make HTTP request with proper error handling"""
    url = f"{BASE_URL}{endpoint}"
    request_headers = HEADERS.copy()
    
    if headers:
        request_headers.update(headers)
        
    if token:
        request_headers["Authorization"] = f"Bearer {token}"
    
    try:
        print(f"   Making {method} request to: {url}")
        if method == "GET":
            response = requests.get(url, headers=request_headers, timeout=60)
        elif method == "POST":
            response = requests.post(url, json=data, headers=request_headers, timeout=60)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=request_headers, timeout=60)
        elif method == "DELETE":
            response = requests.delete(url, headers=request_headers, timeout=60)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        print(f"   Response status: {response.status_code}")
        return response
    except requests.exceptions.RequestException as e:
        print(f"   Request failed: {e}")
        return None

def test_user_registration():
    """Test user registration for different roles"""
    print("\n=== Testing User Registration ===")
    
    # Generate unique timestamp for emails
    import time
    timestamp = str(int(time.time()))
    
    # Test member registration
    member_data = {
        "email": f"sarah.johnson.{timestamp}@email.com",
        "password": "FitnessLife2024!",
        "full_name": "Sarah Johnson",
        "role": "member",
        "phone": "+1-555-0123"
    }
    
    response = make_request("POST", "/register", member_data)
    if response and response.status_code == 200:
        user_data = response.json()
        test_users["member"] = {
            "data": user_data,
            "credentials": {"email": member_data["email"], "password": member_data["password"]}
        }
        results.log_success("Member Registration")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response and response.text else "No response"
        results.log_failure("Member Registration", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Test trainer registration
    trainer_data = {
        "email": f"mike.trainer.{timestamp}@email.com",
        "password": "TrainerPro2024!",
        "full_name": "Mike Rodriguez",
        "role": "trainer",
        "phone": "+1-555-0124"
    }
    
    response = make_request("POST", "/register", trainer_data)
    if response and response.status_code == 200:
        user_data = response.json()
        test_users["trainer"] = {
            "data": user_data,
            "credentials": {"email": trainer_data["email"], "password": trainer_data["password"]}
        }
        results.log_success("Trainer Registration")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response and response.text else "No response"
        results.log_failure("Trainer Registration", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Test admin registration
    admin_data = {
        "email": f"admin.supreme.{timestamp}@email.com",
        "password": "AdminSupreme2024!",
        "full_name": "Alex Supreme",
        "role": "admin",
        "phone": "+1-555-0125"
    }
    
    response = make_request("POST", "/register", admin_data)
    if response and response.status_code == 200:
        user_data = response.json()
        test_users["admin"] = {
            "data": user_data,
            "credentials": {"email": admin_data["email"], "password": admin_data["password"]}
        }
        results.log_success("Admin Registration")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response and response.text else "No response"
        results.log_failure("Admin Registration", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_user_login():
    """Test user login for all registered users"""
    print("\n=== Testing User Login ===")
    
    # First login as member (auto-approved)
    if "member" in test_users and "credentials" in test_users["member"]:
        response = make_request("POST", "/login", test_users["member"]["credentials"])
        if response and response.status_code == 200:
            login_data = response.json()
            test_users["member"]["token"] = login_data["access_token"]
            test_users["member"]["user_info"] = login_data["user"]
            results.log_success("Member Login")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            results.log_failure("Member Login", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Try to login admin first to approve trainer
    if "admin" in test_users and "credentials" in test_users["admin"]:
        response = make_request("POST", "/login", test_users["admin"]["credentials"])
        if response and response.status_code == 200:
            login_data = response.json()
            test_users["admin"]["token"] = login_data["access_token"]
            test_users["admin"]["user_info"] = login_data["user"]
            results.log_success("Admin Login")
            
            # Now approve trainer if admin login successful
            if "trainer" in test_users and "data" in test_users["trainer"]:
                trainer_id = test_users["trainer"]["data"]["id"]
                admin_token = test_users["admin"]["token"]
                approve_response = make_request("PUT", f"/users/{trainer_id}/approve", token=admin_token)
                if approve_response and approve_response.status_code == 200:
                    print("   ✓ Trainer approved by admin")
                    
                    # Now try trainer login
                    response = make_request("POST", "/login", test_users["trainer"]["credentials"])
                    if response and response.status_code == 200:
                        login_data = response.json()
                        test_users["trainer"]["token"] = login_data["access_token"]
                        test_users["trainer"]["user_info"] = login_data["user"]
                        results.log_success("Trainer Login (after approval)")
                    else:
                        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
                        results.log_failure("Trainer Login (after approval)", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            results.log_failure("Admin Login", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            
            # Try trainer login anyway (will likely fail due to approval)
            if "trainer" in test_users and "credentials" in test_users["trainer"]:
                response = make_request("POST", "/login", test_users["trainer"]["credentials"])
                if response and response.status_code == 200:
                    login_data = response.json()
                    test_users["trainer"]["token"] = login_data["access_token"]
                    test_users["trainer"]["user_info"] = login_data["user"]
                    results.log_success("Trainer Login")
                else:
                    error_msg = response.json().get("detail", "Unknown error") if response else "No response"
                    results.log_failure("Trainer Login", f"Status: {response.status_code if response else 'None'}, Error: {error_msg} (likely needs approval)")

def test_user_management():
    """Test user management APIs (admin only)"""
    print("\n=== Testing User Management ===")
    
    if "admin" not in test_users or "token" not in test_users["admin"]:
        results.log_failure("User Management", "Admin token not available")
        return
    
    admin_token = test_users["admin"]["token"]
    
    # Test get all users
    response = make_request("GET", "/users", token=admin_token)
    if response and response.status_code == 200:
        users_list = response.json()
        results.log_success("Get All Users")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Get All Users", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Test approve trainer (if trainer exists)
    if "trainer" in test_users and "data" in test_users["trainer"]:
        trainer_id = test_users["trainer"]["data"]["id"]
        response = make_request("PUT", f"/users/{trainer_id}/approve", token=admin_token)
        if response and response.status_code == 200:
            results.log_success("Approve Trainer")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            results.log_failure("Approve Trainer", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_class_management():
    """Test class management APIs"""
    print("\n=== Testing Class Management ===")
    
    if "trainer" not in test_users or "token" not in test_users["trainer"]:
        results.log_failure("Class Management", "Trainer token not available")
        return
    
    trainer_token = test_users["trainer"]["token"]
    trainer_id = test_users["trainer"]["data"]["id"]
    
    # Create a class
    start_time = datetime.now(timezone.utc) + timedelta(days=1)
    end_time = start_time + timedelta(hours=1)
    
    class_data = {
        "name": "High-Intensity Interval Training",
        "description": "Burn calories and build strength with this intense workout session",
        "trainer_id": trainer_id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "capacity": 15,
        "price": 25.00
    }
    
    response = make_request("POST", "/classes", class_data, token=trainer_token)
    if response and response.status_code == 200:
        class_info = response.json()
        test_classes["hiit"] = class_info
        results.log_success("Create Class")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Create Class", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Get all classes
    response = make_request("GET", "/classes", token=trainer_token)
    if response and response.status_code == 200:
        classes_list = response.json()
        results.log_success("Get All Classes")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Get All Classes", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Get trainer classes
    response = make_request("GET", f"/classes/trainer/{trainer_id}", token=trainer_token)
    if response and response.status_code == 200:
        trainer_classes = response.json()
        results.log_success("Get Trainer Classes")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Get Trainer Classes", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_booking_system():
    """Test booking system APIs"""
    print("\n=== Testing Booking System ===")
    
    if "member" not in test_users or "token" not in test_users["member"]:
        results.log_failure("Booking System", "Member token not available")
        return
    
    if not test_classes:
        results.log_failure("Booking System", "No classes available for booking")
        return
    
    member_token = test_users["member"]["token"]
    class_id = test_classes["hiit"]["id"]
    
    # Create booking
    booking_data = {"class_id": class_id}
    response = make_request("POST", "/bookings", booking_data, token=member_token)
    if response and response.status_code == 200:
        booking_info = response.json()
        test_bookings["hiit_booking"] = booking_info
        results.log_success("Create Booking")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Create Booking", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Get member bookings
    response = make_request("GET", "/bookings/member", token=member_token)
    if response and response.status_code == 200:
        member_bookings = response.json()
        results.log_success("Get Member Bookings")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Get Member Bookings", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_payment_system():
    """Test PayPal payment integration"""
    print("\n=== Testing Payment System ===")
    
    if "member" not in test_users or "token" not in test_users["member"]:
        results.log_failure("Payment System", "Member token not available")
        return
    
    if not test_bookings:
        results.log_failure("Payment System", "No bookings available for payment")
        return
    
    member_token = test_users["member"]["token"]
    booking_id = test_bookings["hiit_booking"]["id"]
    
    # Create payment order
    response = make_request("POST", f"/payments/create-order?booking_id={booking_id}", token=member_token)
    if response and response.status_code == 200:
        payment_order = response.json()
        test_payments["hiit_payment"] = payment_order
        results.log_success("Create Payment Order")
        
        # Complete payment (simulate PayPal completion)
        payment_id = payment_order["order_id"]
        complete_data = {"paypal_order_id": f"PAYPAL_{payment_id}"}
        response = make_request("POST", f"/payments/{payment_id}/complete?paypal_order_id=PAYPAL_{payment_id}", token=member_token)
        if response and response.status_code == 200:
            results.log_success("Complete Payment")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            results.log_failure("Complete Payment", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Create Payment Order", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_progress_tracking():
    """Test progress tracking APIs"""
    print("\n=== Testing Progress Tracking ===")
    
    if "member" not in test_users or "token" not in test_users["member"]:
        results.log_failure("Progress Tracking", "Member token not available")
        return
    
    member_token = test_users["member"]["token"]
    
    # Create progress entry
    progress_data = {
        "weight": 68.5,
        "height": 165.0
    }
    
    response = make_request("POST", "/progress", progress_data, token=member_token)
    if response and response.status_code == 200:
        progress_info = response.json()
        results.log_success("Create Progress Entry")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Create Progress Entry", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Get member progress
    response = make_request("GET", "/progress/member", token=member_token)
    if response and response.status_code == 200:
        progress_list = response.json()
        results.log_success("Get Member Progress")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Get Member Progress", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_feedback_system():
    """Test feedback system APIs"""
    print("\n=== Testing Feedback System ===")
    
    if "member" not in test_users or "token" not in test_users["member"]:
        results.log_failure("Feedback System", "Member token not available")
        return
    
    if "trainer" not in test_users:
        results.log_failure("Feedback System", "Trainer data not available")
        return
    
    member_token = test_users["member"]["token"]
    trainer_id = test_users["trainer"]["data"]["id"]
    
    # Create feedback
    feedback_data = {
        "trainer_id": trainer_id,
        "rating": 5,
        "comment": "Excellent trainer! Very motivating and knowledgeable about fitness techniques.",
        "feedback_type": "trainer"
    }
    
    response = make_request("POST", "/feedback", feedback_data, token=member_token)
    if response and response.status_code == 200:
        feedback_info = response.json()
        results.log_success("Create Feedback")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Create Feedback", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Get trainer feedback (can be accessed by anyone)
    if "trainer" in test_users and "token" in test_users["trainer"]:
        trainer_token = test_users["trainer"]["token"]
        response = make_request("GET", f"/feedback/trainer/{trainer_id}", token=trainer_token)
        if response and response.status_code == 200:
            trainer_feedback = response.json()
            results.log_success("Get Trainer Feedback")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            results.log_failure("Get Trainer Feedback", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_notification_system():
    """Test notification system APIs"""
    print("\n=== Testing Notification System ===")
    
    if "member" not in test_users or "token" not in test_users["member"]:
        results.log_failure("Notification System", "Member token not available")
        return
    
    member_token = test_users["member"]["token"]
    
    # Get notifications
    response = make_request("GET", "/notifications", token=member_token)
    if response and response.status_code == 200:
        notifications = response.json()
        results.log_success("Get Notifications")
        
        # Mark first notification as read if any exist
        if notifications:
            notification_id = notifications[0]["id"]
            response = make_request("PUT", f"/notifications/{notification_id}/read", token=member_token)
            if response and response.status_code == 200:
                results.log_success("Mark Notification Read")
            else:
                error_msg = response.json().get("detail", "Unknown error") if response else "No response"
                results.log_failure("Mark Notification Read", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Get Notifications", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_analytics_dashboard():
    """Test analytics dashboard APIs (admin only)"""
    print("\n=== Testing Analytics Dashboard ===")
    
    if "admin" not in test_users or "token" not in test_users["admin"]:
        results.log_failure("Analytics Dashboard", "Admin token not available")
        return
    
    admin_token = test_users["admin"]["token"]
    
    # Get dashboard analytics
    response = make_request("GET", "/analytics/dashboard", token=admin_token)
    if response and response.status_code == 200:
        analytics_data = response.json()
        results.log_success("Get Dashboard Analytics")
        print(f"   Analytics: {analytics_data}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Get Dashboard Analytics", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_booking_cancellation():
    """Test booking cancellation"""
    print("\n=== Testing Booking Cancellation ===")
    
    if "member" not in test_users or "token" not in test_users["member"]:
        results.log_failure("Booking Cancellation", "Member token not available")
        return
    
    if not test_bookings:
        results.log_failure("Booking Cancellation", "No bookings available for cancellation")
        return
    
    member_token = test_users["member"]["token"]
    booking_id = test_bookings["hiit_booking"]["id"]
    
    # Cancel booking
    response = make_request("PUT", f"/bookings/{booking_id}/cancel", token=member_token)
    if response and response.status_code == 200:
        results.log_success("Cancel Booking")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        results.log_failure("Cancel Booking", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_unauthorized_access():
    """Test unauthorized access to protected endpoints"""
    print("\n=== Testing Unauthorized Access ===")
    
    # Test accessing protected endpoint without token
    response = make_request("GET", "/users")
    if response is not None and response.status_code in [401, 403]:  # Both are valid for unauthorized access
        results.log_success("Unauthorized Access Blocked")
    elif response is not None:
        results.log_failure("Unauthorized Access Blocked", f"Expected 401 or 403, got {response.status_code}")
    else:
        results.log_failure("Unauthorized Access Blocked", "No response received")

def run_all_tests():
    """Run all backend tests in sequence"""
    print("🏋️ Starting Supreme Fitness Gym Backend API Tests")
    print(f"Testing against: {BASE_URL}")
    print("=" * 60)
    
    # Run tests in logical order
    test_user_registration()
    test_user_login()
    test_user_management()
    test_class_management()
    test_booking_system()
    test_payment_system()
    test_progress_tracking()
    test_feedback_system()
    test_notification_system()
    test_analytics_dashboard()
    test_booking_cancellation()
    test_unauthorized_access()
    
    # Print summary
    results.summary()
    
    return results.failed == 0

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)