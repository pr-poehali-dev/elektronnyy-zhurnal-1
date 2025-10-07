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
        
        if student_id:
            cur.execute(f"""
                SELECT g.id, g.grade, g.date, g.comment, s.name as subject_name
                FROM grades g
                JOIN subjects s ON g.subject_id = s.id
                WHERE g.student_id = {student_id}
                ORDER BY g.date DESC
            """)
            
            grades = cur.fetchall()
            
            cur.execute(f"""
                SELECT AVG(grade)::DECIMAL(10,2) 
                FROM grades 
                WHERE student_id = {student_id}
            """)
            
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
        else:
            cur.execute("""
                SELECT g.id, g.grade, g.date, g.comment, s.name as subject_name, 
                       st.first_name || ' ' || st.last_name as student_name
                FROM grades g
                JOIN subjects s ON g.subject_id = s.id
                JOIN students st ON g.student_id = st.id
                ORDER BY g.date DESC
            """)
            
            grades = cur.fetchall()
            
            result = {
                'grades': [
                    {
                        'id': g[0],
                        'grade': g[1],
                        'date': g[2].isoformat() if g[2] else None,
                        'comment': g[3],
                        'subjectName': g[4],
                        'studentName': g[5]
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
        comment = body_data.get('comment', '').replace("'", "''")
        
        cur.execute(f"""
            INSERT INTO grades (student_id, subject_id, grade, date, comment)
            VALUES ({student_id}, {subject_id}, {grade}, '{grade_date}', '{comment}')
            RETURNING id
        """)
        
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