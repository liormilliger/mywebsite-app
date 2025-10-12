import os
import psycopg2
from flask import g, request, current_app

def get_db():
    """
    Opens a new database connection if there is none yet for the
    current application context.
    """
    if 'db' not in g:
        try:
            g.db = psycopg2.connect(
                host=os.environ.get('POSTGRES_HOST', 'db'),
                dbname=os.environ.get('POSTGRES_DB', 'mywebsite'),
                user=os.environ.get('POSTGRES_USER', 'admin'),
                password=os.environ.get('POSTGRES_PASSWORD', 'password'),
                port=os.environ.get('POSTGRES_PORT', 5432)
            )
            current_app.logger.info("Database connection established.")
        except psycopg2.OperationalError as e:
            current_app.logger.error(f"Could not connect to database: {e}")
            return None
    return g.db

def log_visitor():
    """
    Logs the current visitor's IP, user agent, and the page they visited.
    Handles both new and returning visitors.
    """
    db = get_db()
    if db is None:
        current_app.logger.error("No database connection available, skipping visitor log.")
        return

    cursor = db.cursor()
    
    visitor_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    user_agent = request.headers.get('User-Agent')
    page_route = request.path

    try:
        cursor.execute(
            """
            INSERT INTO visitors (ip_address, user_agent)
            VALUES (%s, %s)
            ON CONFLICT (ip_address) DO UPDATE
            SET last_visit_time = NOW(), user_agent = EXCLUDED.user_agent;
            """,
            (visitor_ip, user_agent)
        )
        
        cursor.execute(
            """
            INSERT INTO page_views (visitor_ip, page_route)
            VALUES (%s, %s);
            """,
            (visitor_ip, page_route)
        )
        
        db.commit()
        current_app.logger.info(f"Logged visit from {visitor_ip} to {page_route}")

    except Exception as e:
        db.rollback()
        current_app.logger.error(f"Database error: {e}")
    finally:
        cursor.close()

# # --- Optional: Command to initialize DB from terminal ---
# # This isn't strictly necessary with the Docker init script,
# # but it's good practice for Flask apps.
# def init_db():
#     db = get_db()
#     # Read the init.sql file and execute it
#     with current_app.open_resource('../init/init.sql') as f:
#         db.cursor().execute(f.read().decode('utf8'))
#     db.commit()

# @click.command('init-db')
# def init_db_command():
#     """Clear the existing data and create new tables."""
#     init_db()
#     click.echo('Initialized the database.')
