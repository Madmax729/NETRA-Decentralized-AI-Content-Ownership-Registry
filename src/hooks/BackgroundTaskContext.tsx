import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { pollJobStatus, type JobStatus, type PlagiarismReport } from '@/utils/pdfUtils';

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface BackgroundTask {
  id: string;
  type: 'plagiarism' | 'automation';
  label: string;
  status: 'processing' | 'complete' | 'error';
  progress: number;
  stage: string;
  error?: string;
  result?: any;
  startedAt: number;
}

interface BackgroundTaskContextType {
  tasks: Record<string, BackgroundTask>;
  activeTasks: BackgroundTask[];

  // Plagiarism
  startPlagiarismTask: (jobId: string, fileName: string) => void;
  getPlagiarismResult: () => PlagiarismReport | null;
  getPlagiarismTask: () => BackgroundTask | null;
  clearPlagiarismTask: () => void;

  // Automation
  startAutomationTask: (taskId: string, fileName: string) => void;
  setAutomationResult: (taskId: string, result: any) => void;
  setAutomationError: (taskId: string, error: string) => void;
  getAutomationTask: () => BackgroundTask | null;
  clearAutomationTask: () => void;
}

const BackgroundTaskContext = createContext<BackgroundTaskContextType | null>(null);

/* ─── Provider ───────────────────────────────────────────────────────────── */

export function BackgroundTaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Record<string, BackgroundTask>>({});
  const pollingRefs = useRef<Record<string, boolean>>({});

  // Get all active (processing) tasks
  const activeTasks = Object.values(tasks).filter(
    (t) => t.status === 'processing'
  );

  // Update a task in state
  const updateTask = useCallback((id: string, update: Partial<BackgroundTask>) => {
    setTasks((prev) => {
      if (!prev[id]) return prev;
      return { ...prev, [id]: { ...prev[id], ...update } };
    });
  }, []);

  // ── Plagiarism ──────────────────────────────────────────────────────────

  const startPlagiarismTask = useCallback(
    (jobId: string, fileName: string) => {
      // Cancel any previous plagiarism polling
      Object.keys(pollingRefs.current).forEach((key) => {
        if (key.startsWith('plag-')) {
          pollingRefs.current[key] = false;
        }
      });

      const taskId = `plag-${jobId}`;
      pollingRefs.current[taskId] = true;

      setTasks((prev) => ({
        ...prev,
        [taskId]: {
          id: taskId,
          type: 'plagiarism',
          label: fileName,
          status: 'processing',
          progress: 0,
          stage: 'Starting analysis…',
          startedAt: Date.now(),
        },
      }));

      // Start polling
      const poll = async () => {
        while (pollingRefs.current[taskId]) {
          try {
            const status: JobStatus = await pollJobStatus(jobId);
            setTasks((prev) => {
              if (!prev[taskId]) return prev;
              return {
                ...prev,
                [taskId]: {
                  ...prev[taskId],
                  progress: status.progress,
                  stage: status.stage,
                  status: status.status,
                  result: status.result || prev[taskId].result,
                  error: status.error,
                },
              };
            });

            if (status.status === 'complete' || status.status === 'error') {
              pollingRefs.current[taskId] = false;
              break;
            }
          } catch (err) {
            console.error('[BackgroundTask] Polling error:', err);
          }

          await new Promise((r) => setTimeout(r, 1500));
        }
      };

      poll();
    },
    []
  );

  const getPlagiarismTask = useCallback((): BackgroundTask | null => {
    const plagTasks = Object.values(tasks).filter((t) => t.type === 'plagiarism');
    if (plagTasks.length === 0) return null;
    // Return the most recent one
    return plagTasks.sort((a, b) => b.startedAt - a.startedAt)[0];
  }, [tasks]);

  const getPlagiarismResult = useCallback((): PlagiarismReport | null => {
    const task = getPlagiarismTask();
    if (task?.status === 'complete' && task.result) {
      return task.result as PlagiarismReport;
    }
    return null;
  }, [getPlagiarismTask]);

  const clearPlagiarismTask = useCallback(() => {
    setTasks((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith('plag-')) {
          pollingRefs.current[key] = false;
          delete next[key];
        }
      });
      return next;
    });
  }, []);

  // ── Automation ──────────────────────────────────────────────────────────

  const startAutomationTask = useCallback(
    (taskId: string, fileName: string) => {
      // Cancel any previous automation tasks
      Object.keys(pollingRefs.current).forEach((key) => {
        if (key.startsWith('auto-')) {
          pollingRefs.current[key] = false;
        }
      });

      const id = `auto-${taskId}`;
      setTasks((prev) => ({
        ...prev,
        [id]: {
          id,
          type: 'automation',
          label: fileName,
          status: 'processing',
          progress: 50,
          stage: 'Scanning…',
          startedAt: Date.now(),
        },
      }));
    },
    []
  );

  const setAutomationResult = useCallback(
    (taskId: string, result: any) => {
      const id = `auto-${taskId}`;
      updateTask(id, {
        status: 'complete',
        progress: 100,
        stage: 'Complete',
        result,
      });
    },
    [updateTask]
  );

  const setAutomationError = useCallback(
    (taskId: string, error: string) => {
      const id = `auto-${taskId}`;
      updateTask(id, {
        status: 'error',
        progress: 0,
        stage: 'Failed',
        error,
      });
    },
    [updateTask]
  );

  const getAutomationTask = useCallback((): BackgroundTask | null => {
    const autoTasks = Object.values(tasks).filter((t) => t.type === 'automation');
    if (autoTasks.length === 0) return null;
    return autoTasks.sort((a, b) => b.startedAt - a.startedAt)[0];
  }, [tasks]);

  const clearAutomationTask = useCallback(() => {
    setTasks((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith('auto-')) {
          pollingRefs.current[key] = false;
          delete next[key];
        }
      });
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.keys(pollingRefs.current).forEach((key) => {
        pollingRefs.current[key] = false;
      });
    };
  }, []);

  return (
    <BackgroundTaskContext.Provider
      value={{
        tasks,
        activeTasks,
        startPlagiarismTask,
        getPlagiarismResult,
        getPlagiarismTask,
        clearPlagiarismTask,
        startAutomationTask,
        setAutomationResult,
        setAutomationError,
        getAutomationTask,
        clearAutomationTask,
      }}
    >
      {children}
    </BackgroundTaskContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */

export function useBackgroundTasks() {
  const ctx = useContext(BackgroundTaskContext);
  if (!ctx) {
    throw new Error('useBackgroundTasks must be used within a BackgroundTaskProvider');
  }
  return ctx;
}
