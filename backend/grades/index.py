import json
import os
from typing import Dict, Any
from datetime import date

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление оценками - добавление, просмотр, расчет среднего балла
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict с оценками или средним баллом
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        student_id = params.get('studentId')
        
        if not student_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'studentId required'})
            }
        
        cur.execute("""
            SELECT g.id, g.grade, g.date, g.comment, s.name as subject_name
            FROM grades g
            JOIN subjects s ON g.subject_id = s.id
            WHERE g.student_id = %s
            ORDER BY g.date DESC
        """, (student_id,))
        
        grades = cur.fetchall()
        
        cur.execute("""
            SELECT AVG(grade)::DECIMAL(10,2) 
            FROM grades 
            WHERE student_id = %s
        """, (student_id,))
        
        avg_result = cur.fetchone()
        avg_grade = float(avg_result[0]) if avg_result[0] else 0
        
        result = {
            'averageGrade': avg_grade,
            'grades': [
                {
                    'id': g[0],
                    'grade': g[1],
                    'date': g[2].isoformat() if g[2] else None,
                    'comment': g[3],
                    'subjectName': g[4]
                }
                for g in grades
            ]
        }
        
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
        student_id = body_data.get('studentId')
        subject_id = body_data.get('subjectId')
        grade = body_data.get('grade')
        grade_date = body_data.get('date', str(date.today()))
        comment = body_data.get('comment', '')
        
        cur.execute("""
            INSERT INTO grades (student_id, subject_id, grade, date, comment)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (student_id, subject_id, grade, grade_date, comment))
        
        grade_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'id': grade_id, 'message': 'Оценка добавлена'})
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({'error': 'Method not allowed'})
    }
