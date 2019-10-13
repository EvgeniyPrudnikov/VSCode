import os
import sys
import numpy as np
import time


def pretty_print_result(output, with_header=False):

    l_output = np.array(output)
    to_str = np.vectorize(str)
    get_length = np.vectorize(len)
    max_col_length = np.amax(get_length(to_str(l_output)), axis=0)

    # print result
    if with_header :print('+' + ''.join(['-' * x + '--+' for x in max_col_length]))
    for row_index, row in enumerate(l_output):
        print('|' + ''.join([' ' + str(value).replace('None', 'NULL') + ' ' * (max_col_length[index] - len(str(value))) + ' |' for index, value in enumerate(row)]))
        if (with_header and row_index == 0): #or (row_index == len(l_output) - 1 and len(l_output) < 100 ):
            print('+' + ''.join(['-' * x + '--+' for x in max_col_length]))


def fetch_data(cur, fetch_num=100, with_header=False):

    headers = tuple([i[0].lower() for i in cur.description])
    result = cur.fetchmany(fetch_num)
    if len(result) == 0:
        return -1
    if with_header:
        result.insert(0, headers)

    pretty_print_result(result, with_header)

    return len(result)


def main():
    evn = sys.argv[1]
    conn_str = sys.argv[2]
    query = sys.argv[3]
    qtype = sys.argv[4]

    fetched_rows = 0

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
        res = fetch_data(cur, with_header=True)

    except Exception as e:
        print(str(e) + '\n')
        exit(1)

    if(res > -1 ):
        fetched_rows += res
        # default timeout 1 min
        timeout = time.time() + 60
        while time.time() < timeout:
            try:
                '''messages like :
                >> load:50
                >> exit:0
                '''
                input_msg = sys.stdin.readline()
                cmd = input_msg.split(':')
                if cmd[0] == 'load':
                    res = fetch_data(cur, fetch_num=int(cmd[1]))
                    if res > -1:
                        timeout += 10
                        fetched_rows += res
                    else:
                        break
                else:
                    break
            except Exception as e:
                print(e)
                break

    print('Fetched {0} rows\n'.format(fetched_rows))
    cur.close()
    db.close()


if __name__ == '__main__':
    main()
