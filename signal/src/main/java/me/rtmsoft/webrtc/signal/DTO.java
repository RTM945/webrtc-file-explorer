package me.rtmsoft.webrtc.signal;

public class DTO{

    private String remote;
    private String value;

    public DTO() {
    }

    public DTO(String remote, String value) {
        this.remote = remote;
        this.value = value;
    }

    public void setRemote(String remote) {
        this.remote = remote;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getRemote() {
        return remote;
    }

    public String getValue() {
        return value;
    }

    @Override
    public String toString() {
        return "DTO{" +
                "remote='" + remote + '\'' +
                ", value='" + value + '\'' +
                '}';
    }
}
