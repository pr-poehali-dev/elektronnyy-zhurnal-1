import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление классами - создание, просмотр, удаление
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict со списком классов или результатом операции
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
        teacher_id = params.get('teacherId')
        
        if teacher_id:
            cur.execute("""
                SELECT c.id, c.name, c.teacher_id, u.first_name, u.last_name,
                       (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as student_count
                FROM classes c
                LEFT JOIN users u ON c.teacher_id = u.id
                WHERE c.teacher_id = %s
            """, (teacher_id,))
        else:
            cur.execute("""
                SELECT c.id, c.name, c.teacher_id, u.first_name, u.last_name,
                       (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as student_count
                FROM classes c
                LEFT JOIN users u ON c.teacher_id = u.id
            """)
        
        classes = cur.fetchall()
        result = [
            {
                'id': c[0],
                'name': c[1],
                'teacherId': c[2],
                'teacherFirstName': c[3],
                'teacherLastName': c[4],
                'studentCount': c[5]
            }
            for c in classes
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
        name = body_data.get('name')
        teacher_id = body_data.get('teacherId')
        
        cur.execute("""
            INSERT INTO classes (name, teacher_id)
            VALUES (%s, %s)
            RETURNING id
        """, (name, teacher_id))
        
        class_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'id': class_id, 'message': 'Класс создан'})
        }
    
    if method == 'DELETE':
        params = event.get('queryStringParameters', {})
        class_id = params.get('id')
        
        cur.execute("DELETE FROM classes WHERE id = %s", (class_id,))
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'message': 'Класс удален'})
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({'error': 'Method not allowed'})
    }
