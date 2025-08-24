import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { EmailThread, DraftReply } from '../types';
import LLMService from '../services/LLMService';
import GmailService from '../services/GmailService';

interface EmailDetailScreenProps {
  route: {
    params: {
      emailThread: EmailThread;
    };
  };
  navigation: any;
}

const EmailDetailScreen: React.FC<EmailDetailScreenProps> = ({ route, navigation }) => {
  const { emailThread } = route.params;
  const [draft, setDraft] = useState<DraftReply | null>(null);
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTone, setSelectedTone] = useState<'professional' | 'casual' | 'formal'>('professional');

  useEffect(() => {
    navigation.setOptions({
      title: 'Email Detail',
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={generateDraft}
          disabled={isDraftLoading}
        >
          <Text style={styles.headerButtonText}>
            {isDraftLoading ? 'Generating...' : 'Draft Reply'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [isDraftLoading]);

  const generateDraft = async () => {
    try {
      setIsDraftLoading(true);
      const newDraft = await LLMService.generateEmailDraft(emailThread, selectedTone);
      setDraft(newDraft);
      setEditedContent(newDraft.content);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate draft. Please try again.');
    } finally {
      setIsDraftLoading(false);
    }
  };

  const handleSend = async () => {
    if (!draft) return;

    try {
      setIsSending(true);
      const content = isEditing ? editedContent : draft.content;
      const success = await GmailService.sendReply(emailThread.id, content);
      
      if (success) {
        Alert.alert(
          'Success',
          'Email sent successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', 'Failed to send email. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
      setShowConfirmModal(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(draft?.content || '');
  };

  const handleSaveEdit = () => {
    if (draft) {
      setDraft({ ...draft, content: editedContent });
    }
    setIsEditing(false);
  };

  const handleDeleteDraft = () => {
    setDraft(null);
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSnooze = () => {
    Alert.alert(
      'Snooze Email',
      'This feature will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  const renderToneSelector = () => (
    <View style={styles.toneSelector}>
      <Text style={styles.toneSelectorLabel}>Tone:</Text>
      {(['professional', 'casual', 'formal'] as const).map((tone) => (
        <TouchableOpacity
          key={tone}
          style={[
            styles.toneButton,
            selectedTone === tone && styles.selectedToneButton,
          ]}
          onPress={() => setSelectedTone(tone)}
        >
          <Text
            style={[
              styles.toneButtonText,
              selectedTone === tone && styles.selectedToneButtonText,
            ]}
          >
            {tone.charAt(0).toUpperCase() + tone.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDraftSection = () => {
    if (!draft && !isDraftLoading) return null;

    return (
      <View style={styles.draftSection}>
        <View style={styles.draftHeader}>
          <Text style={styles.draftTitle}>Draft Reply</Text>
          {draft && (
            <View style={styles.draftActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDeleteDraft}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isDraftLoading ? (
          <View style={styles.draftLoading}>
            <ActivityIndicator color="#007AFF" />
            <Text style={styles.draftLoadingText}>Generating draft...</Text>
          </View>
        ) : draft && (
          <>
            {isEditing ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.draftTextInput}
                  value={editedContent}
                  onChangeText={setEditedContent}
                  multiline
                  placeholder="Edit your reply..."
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveEdit}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.draftContent}>{draft.content}</Text>
                <View style={styles.draftFooter}>
                  <View style={styles.draftInfo}>
                    <Text style={styles.draftTone}>Tone: {draft.tone}</Text>
                  </View>
                  <View style={styles.draftButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={handleEdit}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sendButton}
                      onPress={() => setShowConfirmModal(true)}
                      disabled={isSending}
                    >
                      <Text style={styles.sendButtonText}>
                        {isSending ? 'Sending...' : 'Send'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </View>
    );
  };

  const renderConfirmModal = () => (
    <Modal
      visible={showConfirmModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowConfirmModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirm Send</Text>
          <Text style={styles.modalText}>
            Are you sure you want to send this reply?
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowConfirmModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSendButton}
              onPress={handleSend}
              disabled={isSending}
            >
              <Text style={styles.modalSendText}>
                {isSending ? 'Sending...' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Email Thread Info */}
        <View style={styles.emailSection}>
          <View style={styles.emailHeader}>
            <Text style={styles.emailSubject}>{emailThread.subject}</Text>
            <View style={styles.emailMeta}>
              <Text style={styles.emailParticipants}>
                {emailThread.participants.join(', ')}
              </Text>
              <Text style={styles.emailTime}>
                {emailThread.lastMessageDate.toLocaleString()}
              </Text>
            </View>
          </View>
          
          <Text style={styles.emailSnippet}>{emailThread.snippet}</Text>
          
          {emailThread.rationale && (
            <View style={styles.rationaleSection}>
              <Text style={styles.rationaleLabel}>Why this is important:</Text>
              <Text style={styles.rationaleText}>{emailThread.rationale}</Text>
            </View>
          )}
        </View>

        {/* Tone Selector */}
        {!draft && renderToneSelector()}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleSnooze}>
            <Text style={styles.quickActionText}>Snooze</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.quickActionText}>Mark Done</Text>
          </TouchableOpacity>
        </View>

        {/* Draft Section */}
        {renderDraftSection()}
      </View>

      {/* Confirm Send Modal */}
      {renderConfirmModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  emailSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emailHeader: {
    marginBottom: 16,
  },
  emailSubject: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 26,
  },
  emailMeta: {
    marginBottom: 8,
  },
  emailParticipants: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  emailTime: {
    fontSize: 12,
    color: '#888',
  },
  emailSnippet: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  rationaleSection: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  rationaleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  rationaleText: {
    fontSize: 14,
    color: '#333',
  },
  toneSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toneSelectorLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 12,
    color: '#1a1a1a',
  },
  toneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  selectedToneButton: {
    backgroundColor: '#007AFF',
  },
  toneButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectedToneButtonText: {
    color: '#fff',
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  draftSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  draftTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  draftActions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '500',
  },
  draftLoading: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  draftLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  draftContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  draftFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftInfo: {
    flex: 1,
  },
  draftTone: {
    fontSize: 12,
    color: '#666',
  },
  draftButtons: {
    flexDirection: 'row',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  editButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  sendButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  editContainer: {
    marginBottom: 16,
  },
  draftTextInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 150,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  modalSendButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalSendText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
});

export default EmailDetailScreen;