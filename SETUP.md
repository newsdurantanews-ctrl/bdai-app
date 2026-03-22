# BDAi App — Setup Instructions

## ধাপ ১: Firebase API Key
www/js/firebase.js ফাইলে এই line এ আপনার API key দিন:
  apiKey: "REPLACE_WITH_YOUR_API_KEY"

Firebase Console → Project Settings → General → Web API Key

## ধাপ ২: GitHub Repository তৈরি
1. github.com এ login করুন
2. New Repository → নাম: BDAi-App
3. Public করুন

## ধাপ ৩: সব ফাইল Upload
GitHub App থেকে সব ফাইল upload করুন

## ধাপ ৪: APK Build
Code push করলেই GitHub Actions automatic APK বানাবে।
Repository → Actions → BDAi APK Build → Artifacts → APK download করুন

## Admin Setup (Firebase)
Super Admin করতে Firebase Console → Firestore → users → আপনার UID → plan: "super_admin"

## Firebase Rules
Firestore Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /settings/{doc} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.plan in ['super_admin', 'admin'];
    }
    match /payment_requests/{doc} {
      allow create: if request.auth != null;
      allow read, update: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.plan in ['super_admin', 'admin'];
    }
    match /knowledge/{doc} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.plan in ['super_admin', 'admin'];
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
