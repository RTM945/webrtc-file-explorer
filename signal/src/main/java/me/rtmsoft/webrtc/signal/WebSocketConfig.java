package me.rtmsoft.webrtc.signal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.converter.MessageConverter;
import org.springframework.messaging.handler.invocation.HandlerMethodArgumentResolver;
import org.springframework.messaging.handler.invocation.HandlerMethodReturnValueHandler;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.*;

import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig extends WebSocketMessageBrokerConfigurationSupport implements WebSocketMessageBrokerConfigurer {

    @Autowired
    SessionManager sessionManager;

    @Autowired
    PeerManager peerManager;

    @Autowired
    PrincipalChannelInterceptor principalChannelInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic/", "/queue/");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/signalling")
                .setAllowedOrigins("*")
                .withSockJS();
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registry) {
        super.configureWebSocketTransport(registry);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(principalChannelInterceptor);
    }

    @Override
    public boolean configureMessageConverters(List<MessageConverter> messageConverters) {
        return super.configureMessageConverters(messageConverters);
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        super.configureClientOutboundChannel(registration);
    }


    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> argumentResolvers) {
        super.addArgumentResolvers(argumentResolvers);
    }

    @Override
    public void addReturnValueHandlers(List<HandlerMethodReturnValueHandler> returnValueHandlers) {
        super.addReturnValueHandlers(returnValueHandlers);
    }

    @Bean
    public WebSocketHandler subProtocolWebSocketHandler() {
        return new CustomSubProtocolWebSocketHandler(
                clientInboundChannel(),
                clientOutboundChannel(),
                sessionManager, peerManager);
    }
}
