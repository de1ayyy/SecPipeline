def test_studylog_crud(client):
    # 1. 사전 조건: 회원가입 및 로그인
    client.post('/register', data={'username': 'loguser', 'password': 'pw'})
    client.post('/login', data={'username': 'loguser', 'password': 'pw'})
    
    # 2. 목록 페이지 접근
    response = client.get('/logs')
    assert response.status_code == 200
    
    # 3. 새 기록 생성
    response = client.post('/logs/create', data={
        'title': 'Test Log Title',
        'content': 'This is a test content',
        'hours': '2',
        'subject_id': ''
    }, follow_redirects=True)
    
    assert response.status_code == 200
    assert 'Test Log Title'.encode('utf-8') in response.data
