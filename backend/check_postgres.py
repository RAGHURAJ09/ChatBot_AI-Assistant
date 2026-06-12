import psycopg2
import sys

def check_conn(user, password, db, host='localhost', port=5432):
    try:
        conn = psycopg2.connect(
            dbname=db,
            user=user,
            password=password,
            host=host,
            port=port
        )
        print(f"SUCCESS: Connected to {db} as {user}!")
        conn.close()
        return True
    except Exception as e:
        print(f"FAILED to connect as {user}: {e}")
        return False

# Try common defaults
check_conn('postgres', 'postgres', 'postgres')
check_conn('postgres', 'password', 'postgres')
check_conn('postgres', 'admin', 'postgres')
check_conn('postgres', 'root', 'postgres')
