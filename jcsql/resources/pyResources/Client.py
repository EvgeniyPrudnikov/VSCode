import os
import sys
import numpy as np
import time
from datetime import timedelta
import threading
import pyodbc
import cx_Oracle as cx
from queue import Queue


def connect_to_db(conn_str, env):
    db = None
    for _ in range(50):  # 50 attempts
        try:
            if env == 'oracle':
                db = cx.connect(conn_str)
            else:
                db = pyodbc.connect(conn_str, autocommit=True, timeout=0)
            if db:
                break
        except Exception as e:
            raise Exception(e)
    if not db:
        raise Exception('\nCant connect in 50 attempts. Exit 1\n')
    print('\n[{0}] Connected to {1}\n'.format(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()), env))
    return db


def check_start(line):
    block_starts = ['begin', 'declare', 'createpackage', 'createfunction', 'createtrigger', 'createprocedure',
                    'createorreplacepackage', 'createorreplacefunction', 'createorreplacetrigger', 'createorreplaceprocedure']
    return any(map(line.strip().replace(' ', '').startswith, block_starts))


def clear_data(text):

    text_lines = text.split('\n')
    cl_data = []
    is_block = 0

    for line in text_lines:
        if not line.strip('\n '):
            continue
        elif is_block == 0 and check_start(line):
            is_block = 1
            cl_data.append('/')
            cl_data.append(line)
        elif line.strip().startswith('/'):
            is_block = 0
            cl_data.append(line)
        else:
            cl_data.append(line)

    return '\n'.join(cl_data)


def pretty_print_result(output):

    l_output = np.array(output)
    to_str = np.vectorize(str)
    get_length = np.vectorize(len)
    max_col_length = np.amax(get_length(to_str(l_output)), axis=0)

    # print result
    print('+' + ''.join(['-' * x + '--+' for x in max_col_length]))
    for row_index, row in enumerate(l_output):
        print('|' + ''.join([' ' + str(value).replace('None', 'NULL') + ' ' * (
            max_col_length[index] - len(str(value))) + ' |' for index, value in enumerate(row)]))
        if row_index == 0 or row_index == len(l_output) - 1:
            print('+' + ''.join(['-' * x + '--+' for x in max_col_length]))

    print('\nFetched {0} rows\n'.format(len(output) - 1))


def fetch_data(cur, res, fetch_num=100, with_header=False):

    headers = tuple([i[0].lower() for i in cur.description])
    result = cur.fetchmany(fetch_num)

    if with_header:
        result.insert(0, headers)

    res += result

    if len(result) == 0 or len(result) <= fetch_num - 1:
        return -1

    return len(result)


def exec_query(cur):
    result = []

    rows_cnt = fetch_data(cur, result, with_header=True)

    pretty_print_result(result)

    if rows_cnt < 0:
        cur.close()
        os._exit(0)

    # default timeout 30 sec
    timeout = time.time() + 30

    input_msgs = Queue()

    def read_input(msg_q):
        while True:
            msg_q.put(sys.stdin.readline())

    input_t = threading.Thread(target=read_input, args=(input_msgs,))
    input_t.daemon = True
    input_t.start()

    while time.time() < timeout:
        try:
            '''messages like :
            >> load:100
            '''
            if input_msgs.empty():
                time.sleep(0.2)
                continue

            cmd = input_msgs.get().split(':')

            if cmd[0] == 'load':
                rows_cnt = fetch_data(cur, result, fetch_num=int(cmd[1]))
                pretty_print_result(result)

                if rows_cnt < 0:
                    break

                timeout += 10
            else:
                break

        except Exception as e:
            raise Exception(str(e))
    cur.close()


def exec_explain(cur, env):
    if env == 'oracle':
        exp_query = 'SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY)'
        cur.execute(exp_query)
    res = cur.fetchall()
    for line in res:
        print(line[0])
    print('\nFetched {0} rows'.format(len(res)))

    cur.close()


def exec_script(cur, query):
    cl_data = clear_data(query)
    cl_data = filter(None, map(lambda x: x.strip('\n ').replace('\r', ''), cl_data.split('/')))

    # for z in cl_data:
    #     print(z)
    #     print('=====')

    for i in cl_data:
        if not check_start(i):
            si = filter(None, i.split(';'))
            for s in si:
                print(s)
                start = time.time()
                cur.execute(s)
                end = time.time()
                print('\nElapsed {0} s'.format(str(timedelta(seconds=end - start))))
        else:
            print(i)
            cur.callproc("dbms_output.enable")
            start = time.time()
            cur.execute(i)
            textVar = cur.var(str)
            statusVar = cur.var(int)
            c = 0
            while True:
                cur.callproc("dbms_output.get_line", (textVar, statusVar))
                if statusVar.getvalue() != 0:
                    break
                print(textVar.getvalue())
                c += 1
            end = time.time()
            print('\nElapsed {0} s'.format(str(timedelta(seconds=end - start))))

    print('\nFetched {0} rows'.format(1))
    cur.close()


def main():
    env = sys.argv[1]
    conn_str = sys.argv[2]
    query = sys.argv[3]
    qtype = sys.argv[4]  # query , script, explain

    try:
        db = connect_to_db(conn_str, env)
        cur = db.cursor()

        if qtype == 'query':
            cur.execute(query)
            exec_query(cur)
        elif qtype == 'explain':
            cur.execute(query)
            exec_explain(cur, env)
        elif qtype == 'script':
            exec_script(cur, query)

    except Exception as e:
        e_msg = str(e) + '\n'
        print(e_msg)
        print('Fetched {0} rows'.format(len(e_msg.split('\n')) - 1))
        os._exit(1)

    db.close()
    os._exit(0)


if __name__ == '__main__':
    main()
