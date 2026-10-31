import type { Priority, Lifecycle } from "@/lib/test-cases/taxonomy";
import type { ExecutionStatus, TestRunStatus } from "@/lib/test-runs/types";

export interface WorkspaceDashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  totalTestCases: number;
  totalTestRuns: number;
  recentRuns: {
    id: string;
    name: string;
    projectKey: string;
    projectName: string;
    environment: string;
    status: TestRunStatus;
    totalCases: number;
    passedCases: number;
    failedCases: number;
    progressPercent: number;
    createdAt: Date;
  }[];
}

export interface ProjectDashboardMetrics {
  summary: {
    totalTestCases: number;
    totalPlans: number;
    totalRuns: number;
    activeRuns: number;
  };
  lifecycleCounts: Record<Lifecycle, number>;
  priorityCounts: Record<Priority, number>;
  runOutcomes: {
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    notRun: number;
    totalEvaluated: number;
    overallPassRate: number;
  };
  qaPerspective: {
    inProgressRuns: {
      id: string;
      name: string;
      environment: string;
      buildVersion: string | null;
      assigneeName: string | null;
      totalCases: number;
      passed: number;
      failed: number;
      blocked: number;
      notRun: number;
      progressPercent: number;
    }[];
    totalUnexecutedCases: number;
    urgentFailingCases: {
      id: string;
      stableId: string;
      title: string;
      priority: string;
      runName: string;
      lastAttemptResult: string | null;
    }[];
    plansDueSoon: {
      id: string;
      name: string;
      targetRelease: string | null;
      dueDate: Date;
      casesCount: number;
      daysRemaining: number;
    }[];
  };
  devPerspective: {
    recentFailures: {
      runCaseId: string;
      testCaseId: string;
      stableId: string;
      title: string;
      moduleName: string | null;
      priority: string;
      runName: string;
      actualResult: string | null;
      failedAt: Date;
    }[];
    blockedCases: {
      runCaseId: string;
      stableId: string;
      title: string;
      moduleName: string | null;
      runName: string;
      actualResult: string | null;
    }[];
    modulesWithFailureCounts: {
      moduleName: string;
      failureCount: number;
    }[];
    untestedModules: {
      id: string;
      name: string;
      description: string | null;
    }[];
  };
}
