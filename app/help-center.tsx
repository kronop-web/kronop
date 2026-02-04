import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeScreen } from '../components/layout';
import { theme } from '../constants/theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const CONTACT_INFO = {
  phone: '9039012335',
  email: 'angoriyaarun311@gmail.com',
};

export default function HelpCenterScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your AI assistant. How can I help you with your profile or any issues today?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Our support will contact you shortly. You can also call or email from the buttons above.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleCallSupport = () => {
    Alert.alert(
      'Call Support',
      `Do you want to call ${CONTACT_INFO.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${CONTACT_INFO.phone}`),
        },
      ]
    );
  };

  const handleEmailSupport = () => {
    Linking.openURL(`mailto:${CONTACT_INFO.email}?subject=Help Request - VideoTube`);
  };

  const quickQuestions = [
    'How do I complete my profile?',
    'How do I change my settings?',
    'How do I upload a video?',
    'How do I manage privacy?',
  ];

  const handleQuickQuestion = (question: string) => {
    setInputText(question);
  };

  return (
    <SafeScreen edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Contact Info Banner */}
        <View style={styles.contactBanner}>
          <View style={styles.contactHeader}>
            <MaterialIcons name="support-agent" size={24} color={theme.colors.primary.main} />
            <Text style={styles.contactTitle}>Need Direct Support?</Text>
          </View>
          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleCallSupport}
            >
              <MaterialIcons name="phone" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>{CONTACT_INFO.phone}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleEmailSupport}
            >
              <MaterialIcons name="email" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>Email Us</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Questions */}
        {messages.length <= 1 && (
          <View style={styles.quickQuestionsContainer}>
            <Text style={styles.quickQuestionsTitle}>Quick Questions:</Text>
            <View style={styles.quickQuestionsList}>
              {quickQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickQuestionChip}
                  onPress={() => handleQuickQuestion(question)}
                >
                  <Text style={styles.quickQuestionText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {message.role === 'assistant' && (
                <View style={styles.assistantIcon}>
                  <MaterialIcons name="smart-toy" size={20} color={theme.colors.primary.main} />
                </View>
              )}
              <View style={styles.messageContent}>
                <Text
                  style={[
                    styles.messageText,
                    message.role === 'user' ? styles.userText : styles.assistantText,
                  ]}
                >
                  {message.content}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    message.role === 'user' ? styles.userTime : styles.assistantTime,
                  ]}
                >
                  {message.timestamp.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary.main} />
              <Text style={styles.loadingText}>AI is thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ask me anything about your profile..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || loading}
            >
              <MaterialIcons
                name="send"
                size={24}
                color={inputText.trim() && !loading ? '#fff' : theme.colors.text.tertiary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  contactBanner: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  contactTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary.main,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  quickQuestionsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  quickQuestionsTitle: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.sm,
  },
  quickQuestionsList: {
    gap: theme.spacing.sm,
  },
  quickQuestionChip: {
    backgroundColor: theme.colors.background.tertiary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  quickQuestionText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
  },
  assistantIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.xs,
  },
  messageContent: {
    flex: 1,
  },
  messageText: {
    fontSize: theme.typography.fontSize.md,
    lineHeight: 20,
    marginBottom: 4,
  },
  userText: {
    color: '#fff',
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderBottomRightRadius: 4,
  },
  assistantText: {
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: 4,
  },
  messageTime: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: 4,
  },
  userTime: {
    color: theme.colors.text.tertiary,
    textAlign: 'right',
  },
  assistantTime: {
    color: theme.colors.text.tertiary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  loadingText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontStyle: 'italic',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.background.tertiary,
  },
});
