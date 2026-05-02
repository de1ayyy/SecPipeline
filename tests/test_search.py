def test_search(client):
    # 사전 조건: 로그인 필요
    client.post('/register', data={'username': 'searchuser', 'password': 'pw'})
    client.post('/login', data={'username': 'searchuser', 'password': 'pw'})
    
    # 데이터 추가
    client.post('/logs/create', data={
        'title': 'Searchable Log',
        'content': 'keyword123',
        'hours': '1',
        'subject_id': ''
    })
    
    # 검색 요청 검증
    response = client.get('/search?q=Searchable')
    assert response.status_code == 200
    assert 'Searchable Log'.encode('utf-8') in response.data
