import { useState, useRef, useEffect } from 'react';
import { useGetChatHistory, useAddChatMessage, useAnalyzeTreatmentWithAnthropic, useGetPatient, useClearChatHistory } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Send, Bot, User, AlertTriangle, Loader2, AlertCircle, Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PatientId, ChatMessage } from '../types';

interface ChatPanelProps {
  patientId: PatientId;
}

interface ErrorDetails {
  type: 'config' | 'auth' | 'network' | 'quota' | 'rate_limit' | 'service' | 'general';
  title: string;
  message: string;
  actionable: string;
  technicalDetails?: string;
}

export default function ChatPanel({ patientId }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [structuredTreatment, setStructuredTreatment] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    notes: '',
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentError, setCurrentError] = useState<ErrorDetails | null>(null);
  const { data: chatHistory = [], isLoading } = useGetChatHistory(patientId);
  const { data: patient } = useGetPatient(patientId);
  const addMessage = useAddChatMessage();
  const analyzeTreatment = useAnalyzeTreatmentWithAnthropic();
  const clearHistory = useClearChatHistory();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const parseErrorDetails = (error: any): ErrorDetails => {
    const errorMessage = error?.message || String(error);

    if (errorMessage.includes('ANTHROPIC_AUTH_ERROR')) {
      return {
        type: 'auth',
        title: 'Anthropic Authentication Failed',
        message: 'The configured Anthropic API key is invalid or has been revoked.',
        actionable: 'An administrator needs to update the Anthropic API key in Admin Settings with a valid key from console.anthropic.com.',
        technicalDetails: 'Verify the API key is correct and has not been revoked in your Anthropic account.',
      };
    }

    if (errorMessage.includes('ANTHROPIC_CONFIG_ERROR')) {
      return {
        type: 'config',
        title: 'Anthropic Configuration Error',
        message: 'The Anthropic API configuration is missing or incorrect.',
        actionable: 'An administrator needs to configure the Anthropic API key in Admin Settings. Ensure the API key is valid and has the necessary permissions.',
        technicalDetails: 'Check that the Anthropic API key is properly configured in the backend settings.',
      };
    }

    if (errorMessage.includes('ANTHROPIC_NETWORK_ERROR')) {
      return {
        type: 'network',
        title: 'Network Connection Error',
        message: 'Unable to connect to the Anthropic service due to network timeout or connection issues.',
        actionable: 'The request may have taken too long to complete. Try simplifying your query or try again later. If the problem persists, check status.anthropic.com for service status.',
        technicalDetails: 'Requests have a 30-second timeout. Complex queries may exceed this limit. Consider breaking down complex requests into simpler ones.',
      };
    }

    if (errorMessage.includes('ANTHROPIC_RATE_LIMIT')) {
      return {
        type: 'rate_limit',
        title: 'Anthropic Rate Limit Reached',
        message: 'Too many requests have been made to the Anthropic API in a short time.',
        actionable: 'Please wait a few moments and try again. If this persists, an administrator should review the API usage patterns or upgrade the Anthropic plan.',
        technicalDetails: 'Rate limits depend on your Anthropic plan. Consider upgrading for higher limits.',
      };
    }

    if (errorMessage.includes('ANTHROPIC_SERVICE_ERROR')) {
      return {
        type: 'service',
        title: 'Anthropic Service Unavailable',
        message: 'The Anthropic service is temporarily unavailable.',
        actionable: 'Please try again in a few moments. Check status.anthropic.com for service status updates.',
        technicalDetails: 'This is typically a temporary issue with Anthropic\'s infrastructure.',
      };
    }

    if (errorMessage.includes('ANTHROPIC_REQUEST_ERROR')) {
      return {
        type: 'config',
        title: 'Invalid Request Format',
        message: 'The request to Anthropic has an invalid format or JSON structure.',
        actionable: 'An administrator needs to verify the Anthropic API integration follows the latest API documentation.',
        technicalDetails: 'Check the Anthropic Messages API documentation for the correct request format.',
      };
    }

    if (errorMessage.includes('ANTHROPIC_ERROR')) {
      const details = errorMessage.replace('ANTHROPIC_ERROR:', '').trim();
      return {
        type: 'general',
        title: 'AI Analysis Error',
        message: 'An error occurred while performing AI analysis.',
        actionable: 'Please try again. If the problem persists, an administrator should check the Anthropic service status and configuration.',
        technicalDetails: details || 'Check the backend logs for more detailed error information.',
      };
    }

    if (errorMessage.includes('Unauthorized')) {
      return {
        type: 'auth',
        title: 'Access Denied',
        message: 'You do not have permission to access the AI analysis features.',
        actionable: 'Please contact your system administrator to verify your account permissions.',
        technicalDetails: 'Only authenticated users with appropriate roles can access this feature.',
      };
    }

    return {
      type: 'general',
      title: 'Unexpected Error',
      message: 'An unexpected error occurred while processing your request.',
      actionable: 'Please try again. If the problem persists, contact your system administrator for assistance.',
      technicalDetails: errorMessage,
    };
  };

  const performAiAnalysis = async (treatmentQuery: string): Promise<string> => {
    setCurrentError(null);

    try {
      const patientContext = patient
        ? `Patient: ${patient.name}, Age: ${patient.age}\nCurrent Vitals: HR ${patient.currentStatus.heartRate}, BP ${patient.currentStatus.bloodPressure}, Temp ${patient.currentStatus.temperature}°C\nMedical History: ${patient.medicalRecords.length} records on file\nPrevious Treatments: ${patient.treatments.length} treatments recorded`
        : 'Patient data unavailable';

      const contextualQuery = `${treatmentQuery}\n\nPatient Context:\n${patientContext}`;

      let analysisResponse: string;
      try {
        analysisResponse = await analyzeTreatment.mutateAsync({
          patientId,
          treatmentDescription: contextualQuery,
        });
      } catch (anthropicError: any) {
        const errorDetails = parseErrorDetails(anthropicError);
        setCurrentError(errorDetails);
        throw anthropicError;
      }

      return analysisResponse;
    } catch (error: any) {
      console.error('Error performing AI analysis:', error);
      
      if (!currentError) {
        const errorDetails = parseErrorDetails(error);
        setCurrentError(errorDetails);
      }

      throw error;
    }
  };

  const formatAnalysisResponse = (analysisResult: string): string => {
    if (!analysisResult || analysisResult.trim().length === 0) {
      return '⚠️ No analysis results returned. Please try refining your query or providing more specific treatment details.';
    }

    return analysisResult;
  };

  const handleSendMessage = async (content: string, sender: string) => {
    if (!content.trim()) return;

    setCurrentError(null);

    try {
      const newMessage: ChatMessage = {
        messageId: `msg_${Date.now()}`,
        timestamp: Date.now(),
        sender,
        content,
        patientId,
      };
      await addMessage.mutateAsync({ patientId, message: newMessage });

      setIsAnalyzing(true);
      
      let responseContent: string;
      try {
        const analysisResult = await performAiAnalysis(content);
        responseContent = formatAnalysisResponse(analysisResult);
      } catch (analysisError: any) {
        const errorDetails = currentError || parseErrorDetails(analysisError);
        responseContent = `⚠️ **${errorDetails.title}**

${errorDetails.message}

**What you can do:**
${errorDetails.actionable}

${errorDetails.technicalDetails ? `**Technical Details:**\n${errorDetails.technicalDetails}` : ''}`;
      }

      const analysisResponse: ChatMessage = {
        messageId: `msg_${Date.now()}_analysis`,
        timestamp: Date.now(),
        sender: 'AI Assistant',
        content: responseContent,
        patientId,
      };
      await addMessage.mutateAsync({ patientId, message: analysisResponse });

      if (!currentError) {
        toast.success('AI analysis completed successfully');
      } else {
        toast.error('Analysis completed with errors - see message for details');
      }
    } catch (error: any) {
      const errorDetails = parseErrorDetails(error);
      toast.error(errorDetails.title);
      console.error('Chat error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSendMessage(message, 'Doctor');
    setMessage('');
  };

  const handleStructuredSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedTreatment = `**Proposed Treatment:**
- Name: ${structuredTreatment.name}
- Dosage: ${structuredTreatment.dosage}
- Frequency: ${structuredTreatment.frequency}
- Duration: ${structuredTreatment.duration}
- Notes: ${structuredTreatment.notes}

Please analyze this treatment considering the patient's medical history, current vitals, and relevant scientific literature. Provide probabilistic outcomes and evidence-based insights with reference links and citations.`;
    
    await handleSendMessage(formattedTreatment, 'Doctor');
    setStructuredTreatment({ name: '', dosage: '', frequency: '', duration: '', notes: '' });
    
    // Automatically switch to chat tab to view the response
    setActiveTab('chat');
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory.mutateAsync(patientId);
      setCurrentError(null);
      toast.success('Chat history cleared successfully');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to clear chat history';
      toast.error(errorMessage);
      console.error('Clear history error:', error);
    }
  };

  const isSubmitting = addMessage.isPending || isAnalyzing;

  const getErrorIcon = (type: ErrorDetails['type']) => {
    switch (type) {
      case 'config':
        return <Settings className="h-4 w-4" />;
      case 'auth':
        return <AlertCircle className="h-4 w-4" />;
      case 'network':
        return <AlertTriangle className="h-4 w-4" />;
      case 'service':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getErrorVariant = (type: ErrorDetails['type']): 'default' | 'destructive' => {
    return type === 'config' || type === 'auth' || type === 'quota' ? 'destructive' : 'default';
  };

  return (
    <div className="space-y-4">
      {currentError && (
        <Alert variant={getErrorVariant(currentError.type)}>
          <div className="flex items-start gap-2">
            {getErrorIcon(currentError.type)}
            <div className="flex-1 space-y-2">
              <AlertTitle>{currentError.title}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{currentError.message}</p>
                <div className="mt-3">
                  <p className="text-sm font-semibold">What you can do:</p>
                  <p className="text-sm mt-1">{currentError.actionable}</p>
                </div>
                {currentError.technicalDetails && (
                  <div className="mt-3 rounded-md bg-muted/50 p-3">
                    <p className="text-xs font-semibold mb-1">Technical Details:</p>
                    <p className="text-xs font-mono">{currentError.technicalDetails}</p>
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">Chat Input</TabsTrigger>
          <TabsTrigger value="structured">Structured Form</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Treatment Analysis</CardTitle>
                  <CardDescription>
                    Analyze treatment options using AI-powered scientific literature research
                  </CardDescription>
                </div>
                {chatHistory.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={clearHistory.isPending}>
                        {clearHistory.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear History
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Chat History?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all chat messages for this patient. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Clear History
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <AlertTitle className="text-amber-900 dark:text-amber-100">Important Note</AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  This analysis is provided by AI for informational purposes only and combines patient historical records with scientific literature. This system does not make treatment recommendations. All treatment decisions require professional medical judgment.
                </AlertDescription>
              </Alert>

              <ScrollArea className="h-[400px] rounded-md border p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : chatHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No analysis history. Start by entering a treatment query to get AI-powered insights.
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        The system will analyze treatments and combine patient data with scientific literature.
                      </p>
                    </div>
                  ) : (
                    chatHistory.map((msg) => (
                      <div
                        key={msg.messageId}
                        className={`flex gap-3 ${msg.sender === 'Doctor' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender !== 'Doctor' && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.sender === 'Doctor'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                          <p className="mt-1 text-xs opacity-70">
                            {new Date(Number(msg.timestamp)).toLocaleTimeString()}
                          </p>
                        </div>
                        {msg.sender === 'Doctor' && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {isAnalyzing && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="max-w-[80%] rounded-lg bg-muted p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <p className="text-sm">Analyzing treatment with AI...</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <Textarea
                  placeholder="Enter your treatment query... (e.g., 'What are the treatment options for lung cancer in non-smokers with occupational exposure?')"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="flex-1"
                  disabled={isSubmitting}
                />
                <Button type="submit" size="icon" disabled={isSubmitting || !message.trim()}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structured" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Structured Treatment Form</CardTitle>
              <CardDescription>Enter treatment details to get AI-powered analysis and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStructuredSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Treatment Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Amoxicillin"
                      value={structuredTreatment.name}
                      onChange={(e) =>
                        setStructuredTreatment({ ...structuredTreatment, name: e.target.value })
                      }
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dosage">Dosage</Label>
                    <Input
                      id="dosage"
                      placeholder="e.g., 500mg"
                      value={structuredTreatment.dosage}
                      onChange={(e) =>
                        setStructuredTreatment({ ...structuredTreatment, dosage: e.target.value })
                      }
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Input
                      id="frequency"
                      placeholder="e.g., 3 times daily"
                      value={structuredTreatment.frequency}
                      onChange={(e) =>
                        setStructuredTreatment({ ...structuredTreatment, frequency: e.target.value })
                      }
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      placeholder="e.g., 7 days"
                      value={structuredTreatment.duration}
                      onChange={(e) =>
                        setStructuredTreatment({ ...structuredTreatment, duration: e.target.value })
                      }
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information or considerations for the analysis"
                    value={structuredTreatment.notes}
                    onChange={(e) =>
                      setStructuredTreatment({ ...structuredTreatment, notes: e.target.value })
                    }
                    rows={4}
                    disabled={isSubmitting}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Treatment'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
