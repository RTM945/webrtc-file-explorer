package me.rtmsoft.webrtc.signal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionManager {

    private Map<String, WebSocketSession> sessionMap = new ConcurrentHashMap<>();

    public void add(WebSocketSession session) {
        sessionMap.put(session.getId(), session);
    }

    public void remove(WebSocketSession session) {
        sessionMap.remove(session.getId());
    }

    public WebSocketSession get(String sessionId) {
        return sessionMap.get(sessionId);
    }

    public void close(String sessionId, CloseStatus status) {
        WebSocketSession session = get(sessionId);
        if (session != null) {
            try {
                session.close(status);
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}
