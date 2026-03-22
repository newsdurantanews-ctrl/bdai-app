package com.bdai.azad;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class BDAiMessagingService extends FirebaseMessagingService {
    @Override
    public void onMessageReceived(RemoteMessage msg) {
        super.onMessageReceived(msg);
    }
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
    }
}
