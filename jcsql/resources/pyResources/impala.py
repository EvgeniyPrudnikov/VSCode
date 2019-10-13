import pyodbc
import time


def connect_to_db(conn_str):
    db = None
    for x in range(50):  # 50 attempts
        try:
            db = pyodbc.connect(conn_str, autocommit=True, timeout=0)
            if db:break
        except Exception as e:
            raise Exception(e)
    if not db:
        raise Exception('\nCant connect in 50 attempts.\n')
    else:
        db.setencoding(encoding='utf-8')
        print('\n[{0}] Connected to Impala;\n'.format(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())))
    return db


def execute_query(db, query_text, qtype):

    cur = db.cursor()
    try:
        cur.execute(query_text)
    except Exception as e:
        raise Exception(e.args[1])

    return cur
