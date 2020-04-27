package me.rtmsoft.webrtc.signal;

import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.messaging.converter.GenericMessageConverter;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.converter.SimpleMessageConverter;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.util.concurrent.ListenableFuture;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.springframework.web.socket.sockjs.client.SockJsClient;
import org.springframework.web.socket.sockjs.client.WebSocketTransport;

import java.lang.reflect.Type;
import java.util.Collections;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class SignalApplicationTests {

    private static final Logger LOGGER = LoggerFactory.getLogger(SignalApplicationTests.class);

    @LocalServerPort
    int port;

    @Test
    void testConnection() throws Exception {
        String baseUrl = "ws://localhost:" + port + "/signalling";
        String token = UUID.randomUUID().toString();
        createPeer(baseUrl, token, "answer");
        createPeer(baseUrl, token, "offer");
        TimeUnit.SECONDS.sleep(1);
    }

    @Test
    void testWrongType() {
        String baseUrl = "ws://localhost:" + port + "/signalling";
        WebSocketStompClient stompClient = new WebSocketStompClient(new SockJsClient(Collections.singletonList(new WebSocketTransport(new StandardWebSocketClient()))));
        stompClient.setMessageConverter(new MappingJackson2MessageConverter());
        StompHeaders stompHeaders = new StompHeaders();
        stompHeaders.add("token", UUID.randomUUID().toString());
        stompHeaders.add("type", "wrong type");
        stompClient.connect(baseUrl, (WebSocketHttpHeaders) null, stompHeaders, new MySessionHandler("answer"));
    }

    StompSession createPeer(String baseUrl, String token, String type) throws Exception {
        WebSocketStompClient stompClient = new WebSocketStompClient(new SockJsClient(Collections.singletonList(new WebSocketTransport(new StandardWebSocketClient()))));
        MappingJackson2MessageConverter messageConverter = new MappingJackson2MessageConverter();
        stompClient.setMessageConverter(messageConverter);
        StompHeaders stompHeaders = new StompHeaders();
        stompHeaders.add("token", token);
        stompHeaders.add("type", type);
        ListenableFuture<StompSession> future = stompClient.connect(baseUrl, (WebSocketHttpHeaders) null, stompHeaders, new MySessionHandler(type));
        StompSession stompSession = future.get(1, TimeUnit.SECONDS);
        return stompSession;
    }
}
