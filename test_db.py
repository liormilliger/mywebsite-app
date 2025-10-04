import os
import psycopg2
import sys
import time
import requests

# --- Configuration ---
# Read database connection details from environment variables
DB_HOST = os.environ.get('POSTGRES_HOST', 'db')
DB_NAME = os.environ.get('POSTGRES_DB', 'mywebsite')
DB_USER = os.environ.get('POSTGRES_USER', 'admin')
DB_PASS = os.environ.get('POSTGRES_PASSWORD', 'password')
APP_URL = "http://web:5000" # The service name 'web' is used as the hostname

# --- Helper Functions ---

def get_db_connection():
    """Establishes and returns a database connection."""
    for i in range(5): # Retry connection up to 5 times
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASS
            )
            print("✅ Successfully connected to the database.")
            return conn
        except psycopg2.OperationalError as e:
            print(f"⏳ Could not connect to database (attempt {i+1}/5): {e}")
            time.sleep(5)
    return None

def run_test(test_function):
    """A wrapper to run a test and print its status."""
    test_name = test_function.__name__
    print(f"\n--- Running Test: {test_name} ---")
    try:
        test_function()
        print(f"✅ PASSED: {test_name}")
        return True
    except Exception as e:
        print(f"❌ FAILED: {test_name}")
        print(f"   Error: {e}")
        return False

# --- Test Cases ---

def test_01_check_table_existence():
    """Verify that the expected tables ('visitors', 'page_views') have been created."""
    conn = get_db_connection()
    if not conn:
        raise ConnectionError("Database connection failed.")
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.visitors');")
            visitors_table = cur.fetchone()[0]
            assert visitors_table is not None, "'visitors' table does not exist."

            cur.execute("SELECT to_regclass('public.page_views');")
            page_views_table = cur.fetchone()[0]
            assert page_views_table is not None, "'page_views' table does not exist."
    finally:
        conn.close()

def test_02_app_health_check():
    """Check if the web application's home page is responsive and returns a 200 OK status."""
    response = requests.get(APP_URL)
    response.raise_for_status() # This will raise an exception for 4xx or 5xx status codes
    assert response.status_code == 200, f"Expected status code 200, but got {response.status_code}"

def test_03_app_and_db_connectivity():
    """
    Test the full loop:
    1. Visit the app's home page to trigger the visitor logging middleware.
    2. Check the database to confirm that a new page view was recorded.
    """
    conn = get_db_connection()
    if not conn:
        raise ConnectionError("Database connection failed.")

    try:
        with conn.cursor() as cur:
            # Get the count of page views before the test
            cur.execute("SELECT COUNT(*) FROM page_views WHERE page_route = '/';")
            initial_count = cur.fetchone()[0]

            # Trigger the logging by visiting the home page
            print("   Simulating a visit to the home page...")
            response = requests.get(APP_URL, headers={'User-Agent': 'CI-Test-Agent'})
            assert response.status_code == 200, "App visit failed."
            
            # Wait a moment for the transaction to complete
            time.sleep(2)

            # Get the count of page views after the test
            cur.execute("SELECT COUNT(*) FROM page_views WHERE page_route = '/';")
            final_count = cur.fetchone()[0]

            assert final_count > initial_count, "No new page view was logged in the database."
    finally:
        conn.close()


# ===============================================
# Main Execution Block
# This is the entry point when the script is run.
# ===============================================
if __name__ == "__main__":
    print("🚀 Starting Integration Test Suite...")
    
    # List of all test functions to run
    tests_to_run = [
        test_01_check_table_existence,
        test_02_app_health_check,
        test_03_app_and_db_connectivity
    ]
    
    results = [run_test(test) for test in tests_to_run]
    
    print("\n--- Test Suite Summary ---")
    if all(results):
        print("✅ All tests passed successfully!")
        sys.exit(0) # Exit with a success code
    else:
        failed_count = results.count(False)
        print(f"❌ {failed_count} test(s) failed.")
        sys.exit(1) # Exit with a failure code to stop the CI pipeline

