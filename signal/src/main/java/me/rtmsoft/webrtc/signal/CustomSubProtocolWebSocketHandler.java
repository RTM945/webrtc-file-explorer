package me.rtmsoft.webrtc.signal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.SubscribableChannel;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.messaging.SubProtocolWebSocketHandler;

public class CustomSubProtocolWebSocketHandler extends SubProtocolWebSocketHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(CustomSubProtocolWebSocketHandler.class);

    private SessionManager sessionManager;
    private PeerManager peerManager;

    public CustomSubProtocolWebSocketHandler(
            MessageChannel clientInboundChannel,
            SubscribableChannel clientOutboundChannel,
            SessionManager sessionManager,
            PeerManager peerManager) {
        super(clientInboundChannel, clientOutboundChannel);
        this.sessionManager = sessionManager;
        this.peerManager = peerManager;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        LOGGER.info(session.getId() + " connection established");
        sessionManager.add(session);
        super.afterConnectionEstablished(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        LOGGER.info(session.getId() + " connection closed");
        sessionManager.remove(session);
        peerManager.remove(session.getId());
        super.afterConnectionClosed(session, closeStatus);
    }
}
