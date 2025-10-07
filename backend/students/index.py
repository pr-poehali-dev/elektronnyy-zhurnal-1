import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление учениками - создание, просмотр, удаление
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict со списком учеников или результатом операции
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
            cur.execute("""
                SELECT u.id, u.email, u.first_name, u.last_name 
                FROM users u
                JOIN class_students cs ON u.id = cs.student_id
                WHERE cs.class_id = %s AND u.role = 'student'
            """, (class_id,))
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
        
        cur.execute("""
            INSERT INTO users (email, password, role, first_name, last_name)
            VALUES (%s, %s, 'student', %s, %s)
            RETURNING id
        """, (email, password, first_name, last_name))
        
        student_id = cur.fetchone()[0]
        
        if class_id:
            cur.execute("""
                INSERT INTO class_students (class_id, student_id)
                VALUES (%s, %s)
            """, (class_id, student_id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'id': student_id, 'message': 'Ученик создан'})
        }
    
    if method == 'DELETE':
        params = event.get('queryStringParameters', {})
        student_id = params.get('id')
        
        cur.execute("UPDATE users SET role = 'deleted' WHERE id = %s", (student_id,))
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
