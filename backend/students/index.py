import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление учениками - создание, просмотр, удаление, добавление в класс
    Args: event - dict с httpMethod, body, queryStringParameters, pathParams
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict со списком учеников или результатом операции
    '''
    method: str = event.get('httpMethod', 'GET')
    path_params = event.get('pathParams', {})
    action = path_params.get('action', '')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    import psycopg2
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    if method == 'GET':
        params = event.get('queryStringParameters', {})
        class_id = params.get('classId')
        
        if class_id:
            cur.execute(f"""
                SELECT u.id, u.email, u.first_name, u.last_name 
                FROM users u
                JOIN class_students cs ON u.id = cs.student_id
                WHERE cs.class_id = {class_id} AND u.role = 'student'
            """)
        else:
            cur.execute("""
                SELECT id, email, first_name, last_name 
                FROM users 
                WHERE role = 'student'
            """)
        
        students = cur.fetchall()
        result = [
            {
                'id': s[0],
                'email': s[1],
                'firstName': s[2],
                'lastName': s[3]
            }
            for s in students
        ]
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps(result)
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        email = body_data.get('email')
        password = body_data.get('password', 'student123')
        first_name = body_data.get('firstName')
        last_name = body_data.get('lastName')
        class_id = body_data.get('classId')
        
        email_safe = email.replace("'", "''")
        password_safe = password.replace("'", "''")
        first_name_safe = first_name.replace("'", "''")
        last_name_safe = last_name.replace("'", "''")
        
        cur.execute(f"""
            INSERT INTO users (email, password, role, first_name, last_name)
            VALUES ('{email_safe}', '{password_safe}', 'student', '{first_name_safe}', '{last_name_safe}')
            RETURNING id
        """)
        
        student_id = cur.fetchone()[0]
        
        if class_id:
            cur.execute(f"""
                INSERT INTO class_students (class_id, student_id)
                VALUES ({class_id}, {student_id})
            """)
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'id': student_id, 'message': 'Ученик создан'})
        }
    
    if method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        class_id = body_data.get('classId')
        student_id = body_data.get('studentId')
        
        cur.execute(f"""
            INSERT INTO class_students (class_id, student_id)
            VALUES ({class_id}, {student_id})
            ON CONFLICT (class_id, student_id) DO NOTHING
        """)
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'message': 'Ученик добавлен в класс'})
        }
    
    if method == 'DELETE':
        params = event.get('queryStringParameters', {})
        student_id = params.get('id')
        
        cur.execute(f"UPDATE users SET role = 'deleted' WHERE id = {student_id}")
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'message': 'Ученик удален'})
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({'error': 'Method not allowed'})
    }