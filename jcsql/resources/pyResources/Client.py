import os
import sys
import numpy as np
import time


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
        if row_index == 0 or (row_index == len(l_output) - 1):
            print('+' + ''.join(['-' * x + '--+' for x in max_col_length]))

    print('Fetched {0} rows\n'.format(len(output) - 1))


def fetch_data(cur, res, fetch_num=100, with_header=False):

    headers = tuple([i[0].lower() for i in cur.description])
    result = cur.fetchmany(fetch_num)

    if with_header:
        result.insert(0, headers)

    res += result

    return len(result)


def main():
    evn = sys.argv[1]
    conn_str = sys.argv[2]
    query = sys.argv[3]
    qtype = sys.argv[4]

    fetched_rows = 0

    result = []
    exec_module = None
    if evn == 'oracle':
        import oracle as exec_module
    elif evn == 'impala':
        import impala as exec_module
    else:
        raise Exception('Wrong environment')

    try:
        db = exec_module.connect_to_db(conn_str)
        cur = exec_module.execute_query(db, query, qtype)
        fetched_rows += fetch_data(cur, result, with_header=True)

        pretty_print_result(result)
    except Exception as e:
        print(str(e) + '\n')
        exit(1)


    # default timeout 1 min
    timeout = time.time() + 60
    while time.time() < timeout:
        try:
            '''messages like :
            >> load:50
            >> exit:0
            '''
            input_msg = sys.stdin.readline()
            print(input_msg.decode('utf-8'))
            cmd = input_msg.decode('utf-8').split(':')
            if cmd[0] == 'load':
                fetched_rows += fetch_data(cur, result, fetch_num=int(cmd[1]))
                pretty_print_result(result)
                timeout += 10
            else:
                break
        except Exception as e:
            print(e)
            break


    cur.close()
    db.close()


if __name__ == '__main__':
    main()
