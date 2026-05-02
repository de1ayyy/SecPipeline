def test_login_page(client):
    response = client.get('/login')
    assert response.status_code == 200

def test_register_page(client):
    response = client.get('/register')
    assert response.status_code == 200

def test_auth_flow(client):
    # 1. 회원가입
    response = client.post('/register', data={'username': 'testuser', 'password': 'testpassword'}, follow_redirects=True)
    assert response.status_code == 200
    
    # 2. 로그인
    response = client.post('/login', data={'username': 'testuser', 'password': 'testpassword'}, follow_redirects=True)
    assert response.status_code == 200
    assert '로그아웃'.encode('utf-8') in response.data or '내 학습 기록'.encode('utf-8') in response.data
    
    # 3. 로그아웃
    response = client.get('/logout', follow_redirects=True)
    assert response.status_code == 200
