import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Управление расписанием занятий
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict с расписанием
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
        class_id = params.get('classId')
        
        if not class_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'classId required'})
            }
        
        cur.execute("""
            SELECT sc.id, sc.day_of_week, sc.time_start, sc.time_end, 
                   sc.room, s.name as subject_name
            FROM schedule sc
            JOIN subjects s ON sc.subject_id = s.id
            WHERE sc.class_id = %s
            ORDER BY sc.day_of_week, sc.time_start
        """, (class_id,))
        
        schedule_items = cur.fetchall()
        
        result = [
            {
                'id': item[0],
                'dayOfWeek': item[1],
                'timeStart': item[2].isoformat() if item[2] else None,
                'timeEnd': item[3].isoformat() if item[3] else None,
                'room': item[4],
                'subjectName': item[5]
            }
            for item in schedule_items
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
        class_id = body_data.get('classId')
        subject_id = body_data.get('subjectId')
        day_of_week = body_data.get('dayOfWeek')
        time_start = body_data.get('timeStart')
        time_end = body_data.get('timeEnd')
        room = body_data.get('room', '')
        
        cur.execute("""
            INSERT INTO schedule (class_id, subject_id, day_of_week, time_start, time_end, room)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (class_id, subject_id, day_of_week, time_start, time_end, room))
        
        schedule_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'isBase64Encoded': False,
            'body': json.dumps({'id': schedule_id, 'message': 'Расписание добавлено'})
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps({'error': 'Method not allowed'})
    }
