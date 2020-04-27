package me.rtmsoft.webrtc.signal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PeerManager {

    private static final Logger LOGGER = LoggerFactory.getLogger(PeerManager.class);

    private Map<String, Peer> peerMap = new ConcurrentHashMap<>();

    public boolean isRegistered(String name) {
        return peerMap.get(name) != null;
    }

    public void add(Peer peer) {
        peerMap.put(peer.getName(), peer);
    }

    public Peer pair(Peer peer, String remote) {
        if ("offer".equals(peer.getType())) {
            return peerMap.get(peer.getToken() + Peer.ANSWER_SUFFIX);
        }else if ("answer".equals(peer.getType())){
            return peerMap.get(peer.getToken() + Peer.OFFER_SUFFIX + "_" + remote);
        }
        return null;
    }

    public void remove(String sessionId) {
        peerMap.forEach((k, v) -> {
            if (v.getSessionId().equals(sessionId)){
                peerMap.remove(k);
                LOGGER.info(sessionId + " remove peer " + v.getName());
            }
        });
    }
}
