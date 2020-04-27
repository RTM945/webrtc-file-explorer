package me.rtmsoft.webrtc.signal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;

import java.lang.reflect.Type;

public class MySessionHandler extends StompSessionHandlerAdapter {
    private static final Logger LOGGER = LoggerFactory.getLogger(MySessionHandler.class);

    private String type;
    private StompSession session;

    public MySessionHandler(String type) {
        this.type = type;
    }

    @Override
    public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
        this.session = session;
        session.subscribe("/user/queue/onsdp", this);
        if ("offer".equals(type)) {
            session.send("/app/sdp", new DTO("", "offer's sdp"));
        }
    }
    @Override
    public Type getPayloadType(StompHeaders headers) {
        return DTO.class;
    }

    @Override
    public void handleException(StompSession session, StompCommand command, StompHeaders headers, byte[] payload, Throwable exception) {
        exception.printStackTrace();
    }

    @Override
    public void handleFrame(StompHeaders headers, Object payload) {
        DTO dto = (DTO) payload;
        LOGGER.info(type + " receive " + dto);
        if(type.equals("answer")){
            session.send("/app/sdp", new DTO(dto.getRemote(), "answer's sdp"));
        }
    }
}
