import os
import sys
import numpy as np
import time
import threading
from queue import Queue


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
        exit(0)

    # default timeout 1 min
    timeout = time.time() + 5

    input_msgs = Queue()
    input_t = threading.Thread(target=lambda msg_q: msg_q.put(sys.stdin.readline()), args=(input_msgs,))
    input_t.daemon = True
    input_t.start()


    while time.time() < timeout:
        try:
            '''messages like :
            >> load:100
            >> exit:0
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


def exec_script(cur):
    pass


def main():
    env = sys.argv[1]
    conn_str = sys.argv[2]
    query = sys.argv[3]
    qtype = sys.argv[4]  # query , script, explain

    exec_module = None
    if env == 'oracle':
        import oracle as exec_module
    elif env == 'impala':
        import impala as exec_module
    else:
        raise Exception('Wrong environment')

    try:
        db = exec_module.connect_to_db(conn_str)
        cur = exec_module.execute_query(db, query)

        if qtype == 'query':
            exec_query(cur)
        elif qtype == 'explain':
            exec_explain(cur, env)
        elif qtype == 'script':
            exec_script(cur)

    except Exception as e:
        print(str(e) + '\n',file=sys.stdout)
        exit(1)

    db.close()
    exit(0)


if __name__ == '__main__':
    main()
