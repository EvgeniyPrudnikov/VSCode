import pyodbc
import time


def connect_to_db(conn_str):
    db = None
    for x in range(50):  # 50 attempts
        try:
            db = pyodbc.connect(conn_str)
            if db:break
        except Exception as e:
            raise Exception(e)
    if not db:
        raise Exception('\nCant connect in 50 attempts. Exit 1\n')
    print('\n[{0}] Connected to Oracle\n'.format(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())))
    return db


def execute_query(db, query_text):

    cur = db.cursor()

    try:
        cur.execute(query_text)
    except pyodbc.Error as e:
        msg = e.args[1]
        if msg.find('\n') > 0:
            msg = msg[:msg.find('\n')]
        raise Exception(msg)

    return cur