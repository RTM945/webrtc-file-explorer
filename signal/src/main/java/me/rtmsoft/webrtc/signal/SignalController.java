package me.rtmsoft.webrtc.signal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class SignalController {

    private static final Logger LOGGER = LoggerFactory.getLogger(SignalController.class);

    @Autowired
    private PeerManager peerManager;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/sdp")
    public void sdp(@Payload DTO data, Principal principal) {
        Peer peer = (Peer) principal;
        Peer pair = peerManager.pair(peer, data.getRemote());
        LOGGER.info("pair:" + peer + ", " + pair);
        if(pair != null) {
            DTO dto = new DTO(peer.getSessionId(), data.getValue());
            messagingTemplate.convertAndSendToUser(pair.getName(), "/queue/onsdp", dto);
        }
    }

    @MessageMapping("/candidate")
    public void candidate(@Payload DTO data, Principal principal) {
        Peer peer = (Peer) principal;
        Peer pair = peerManager.pair(peer, data.getRemote());
        LOGGER.info("pair:" + peer + ", " + pair);
        if(pair != null) {
            DTO dto = new DTO(peer.getSessionId(), data.getValue());
            messagingTemplate.convertAndSendToUser(pair.getName(), "/queue/oncandidate", dto);
        }
    }
}
