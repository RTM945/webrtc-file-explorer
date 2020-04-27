package me.rtmsoft.webrtc.signal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.CloseStatus;

@Component
public class PrincipalChannelInterceptor implements ChannelInterceptor {

    private static final Logger LOGGER = LoggerFactory.getLogger(PrincipalChannelInterceptor.class);

    @Autowired
    private PeerManager peerManager;

    @Autowired
    private SessionManager sessionManager;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && accessor.getCommand() == StompCommand.CONNECT) {
            String sessionId = accessor.getSessionId();
            try {
                String token = accessor.getNativeHeader("token").get(0);
                String type = accessor.getNativeHeader("type").get(0);
                if (("offer".equals(type) || "answer".equals(type)) && !StringUtils.isEmpty(token)) {
                    if (!peerManager.isRegistered(token)) {
                        Peer peer = new Peer(token, type, sessionId);
                        peerManager.add(peer);
                        accessor.setUser(peer);
                        LOGGER.info(sessionId + " set principal " + peer.getName());
                    }else{
                        sessionManager.close(sessionId, CloseStatus.SERVICE_RESTARTED);
                    }
                }else {
                    sessionManager.close(sessionId, CloseStatus.PROTOCOL_ERROR);
                }
            } catch (Exception e) {
                e.printStackTrace();
                sessionManager.close(sessionId, CloseStatus.PROTOCOL_ERROR);
            }
        }
        return message;
    }
}
