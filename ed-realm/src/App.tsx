import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { SignIn } from './components/SignIn';
import { Layout } from './components/Layout';
import { StudentDashboard } from './components/StudentDashboard';
import { FacultyDashboard } from './components/FacultyDashboard';
import { TrainerDashboard } from './components/TrainerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ProblemsPage } from './components/ProblemsPage';
import { CodeEditor } from './components/CodeEditor';
import { CodePracticeConsole } from './components/CodePracticeConsole';
import { Leaderboard } from './components/Leaderboard';
import { Messages } from './components/Messages';
import { ContestNotificationProvider, ContestNotificationPopup } from './components/ContestNotification';
import { StudentContestDashboard } from './components/StudentContestDashboard';
import { ContestParticipation } from './components/ContestParticipation';
import { CoursesPage } from './components/CoursesPage';
import { GradingQueue } from './components/GradingQueue';
import { BatchManagement } from './components/BatchManagement';
import { ManageInstitutions } from './components/ManageInstitutions';
import { BatchYears } from './components/BatchYears';
import { Billing } from './components/Billing';
import { CodingContest } from './components/CodingContest';
import { MyTrainers, SendInvitation } from './components/TrainerInvitation';
import { AssessmentManagement } from './components/AssessmentManagement';
import { UserManagement } from './components/UserManagement';
import { AnalyticsPage } from './components/AnalyticsPage';
import { AttendancePage } from './components/AttendancePage';
import { StudentSettings } from './components/StudentSettings';
import { StudentProfile } from './components/StudentProfile';
import { TrainerProfile } from './components/TrainerProfile';
import { TestManagement } from './components/TestManagement';
import { CourseModulesPage } from './components/CourseModulesPage';
import { TestMonitoring } from './components/TestMonitoring';
import { ProgramizCompiler } from './components/ProgramizCompiler';
import { StudentModuleView } from './components/StudentModuleView';
import { StudentCodingChallenge } from './components/StudentCodingChallenge';
import { AssignmentListingPage } from './components/AssignmentListingPage';
import { TopicDetailsPage } from './components/TopicDetailsPage';
import { CodingChallengeUI } from './components/CodingChallengeUI';
import { StudentCourseTests } from './components/StudentCourseTests';
import { MaterialManagement } from './components/MaterialManagement';
import { TrainerMaterials } from './components/TrainerMaterials';
import { AccountProfile } from './components/AccountProfile';
import { AccountSettings } from './components/AccountSettings';
import { Problem } from './lib/data';
import { canAccessPage, normalizePageId, PageId } from './lib/navigation';
import { Toaster } from './components/ui/sonner';

function AppContent() {
    const { currentUser } = useAuth();
    const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
    const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
    const [pageData, setPageData] = useState<unknown>(null);

    React.useEffect(() => {
        if (currentUser) {
            setCurrentPage('dashboard');
            setSelectedProblem(null);
            setPageData(null);
        }
    }, [currentUser?.id]);

    React.useEffect(() => {
        if (!currentUser) return;

        if (currentPage === 'problem' || currentPage === 'editor') {
            if (!canAccessPage(currentUser.role, 'editor')) {
                setCurrentPage('dashboard');
                setSelectedProblem(null);
                setPageData(null);
            }
            return;
        }

        if (!canAccessPage(currentUser.role, currentPage)) {
            setCurrentPage('dashboard');
            setSelectedProblem(null);
            setPageData(null);
        }
    }, [currentPage, currentUser]);

    if (!currentUser) {
        return <SignIn />;
    }

    const handleNavigate = (page: string, data?: unknown) => {
        const normalizedPage = normalizePageId(page);

        if (normalizedPage === 'problem' && data) {
            if (!canAccessPage(currentUser.role, 'editor')) {
                setCurrentPage('dashboard');
                setPageData(null);
                setSelectedProblem(null);
                return;
            }

            setPageData(data);
            setSelectedProblem(data as Problem);
            setCurrentPage('editor');
            return;
        }

        if (!canAccessPage(currentUser.role, normalizedPage)) {
            setCurrentPage('dashboard');
            setPageData(null);
            setSelectedProblem(null);
            return;
        }

        setPageData(data || null);
        setCurrentPage(normalizedPage);
        setSelectedProblem(null);
    };

    const renderContent = () => {
        if (currentPage === 'editor' && selectedProblem) {
            return <CodeEditor problem={selectedProblem} onBack={() => handleNavigate('problems')} />;
        }

        if (currentPage === 'code-practice') {
            return <CodePracticeConsole onBack={() => handleNavigate('dashboard')} />;
        }

        if (currentPage === 'assignment-listing' && pageData) {
            const assignmentPageData = pageData as {
                assignment: any;
                moduleName: string;
                courseName: string;
                previousData: unknown;
            };
            return (
                <AssignmentListingPage
                    assignment={assignmentPageData.assignment}
                    moduleName={assignmentPageData.moduleName}
                    courseName={assignmentPageData.courseName}
                    onSelectTopic={(topic) => {
                        handleNavigate('coding-challenge-ui', {
                            topicTitle: topic.title,
                            difficulty: topic.difficulty || 'Easy',
                            problemDescription: 'Find the length of the longest substring without repeating characters in a given string.',
                            examples: [
                                {
                                    id: 'ex-1',
                                    input: 'str = "abcabcbb"',
                                    output: '3',
                                    explanation: 'The longest substring without repeating characters is "abc", with the length of 3.',
                                },
                            ],
                            testCases: [
                                { id: 'tc-1', input: 'abcabcbb', expectedOutput: '3', hidden: false },
                                { id: 'tc-2', input: 'bbbbb', expectedOutput: '1', hidden: false },
                                { id: 'tc-3', input: 'pwwkew', expectedOutput: '3', hidden: false },
                            ],
                            previousData: assignmentPageData,
                        });
                    }}
                    onBack={() => handleNavigate('student-module', assignmentPageData.previousData as any)}
                />
            );
        }

        if (currentPage === 'topic-details' && pageData) {
            const topicPageData = pageData as {
                assignment: { question: string };
                moduleName: string;
                courseName: string;
                topic: { id: string; title: string; difficulty?: 'Easy' | 'Medium' | 'Hard'; content: string };
            };
            return (
                <TopicDetailsPage
                    assignmentTitle={topicPageData.assignment.question}
                    moduleName={topicPageData.moduleName}
                    courseName={topicPageData.courseName}
                    selectedTopicId={topicPageData.topic.id}
                    onSelectTopic={(topicId) => {
                        const updatedData = { ...topicPageData, topic: { ...topicPageData.topic, id: topicId } };
                        setPageData(updatedData);
                    }}
                    onStartCoding={() => {
                        handleNavigate('coding-challenge-ui', {
                            topicTitle: topicPageData.topic.title,
                            difficulty: topicPageData.topic.difficulty || 'Easy',
                            problemDescription: topicPageData.topic.content,
                            examples: [
                                {
                                    id: 'ex-1',
                                    input: 'abcabcbb',
                                    output: '3',
                                    explanation: 'The longest substring without repeating characters is "abc".',
                                },
                            ],
                            testCases: [
                                { id: 'tc-1', input: 'abcabcbb', expectedOutput: '3', hidden: false },
                                { id: 'tc-2', input: 'bbbbb', expectedOutput: '1', hidden: false },
                                { id: 'tc-3', input: 'pwwkew', expectedOutput: '3', hidden: true },
                            ],
                        });
                    }}
                    onBack={() => handleNavigate('assignment-listing')}
                />
            );
        }

        if (currentPage === 'course-tests' && pageData && currentUser.role === 'student') {
            return <StudentCourseTests course={(pageData as { course: any }).course} onBack={() => handleNavigate('courses')} />;
        }

        if (currentPage === 'student-module' && pageData) {
            const modulePageData = pageData as { course: any; module: any };
            return (
                <StudentModuleView
                    course={modulePageData.course}
                    selectedModule={modulePageData.module}
                    onNavigate={(page, data) => {
                        if (page === 'assignment-listing') {
                            handleNavigate('assignment-listing', {
                                assignment: data,
                                moduleName: modulePageData.module.title,
                                courseName: modulePageData.course.title,
                                previousData: modulePageData,
                            });
                        } else {
                            handleNavigate(page, data);
                        }
                    }}
                    onBack={() => handleNavigate('course-modules', modulePageData.course)}
                />
            );
        }

        if (currentPage === 'coding-challenge-ui' && pageData) {
            const challengePageData = pageData as {
                topicTitle: string;
                difficulty: 'Easy' | 'Medium' | 'Hard';
                problemDescription: string;
                examples: any[];
                testCases: any[];
                previousData?: unknown;
            };
            return (
                <CodingChallengeUI
                    topicTitle={challengePageData.topicTitle}
                    difficulty={challengePageData.difficulty}
                    problemDescription={challengePageData.problemDescription}
                    examples={challengePageData.examples}
                    testCases={challengePageData.testCases}
                    onSubmit={() => {
                        if (challengePageData.previousData) {
                            handleNavigate('assignment-listing', challengePageData.previousData as any);
                        } else {
                            handleNavigate('dashboard');
                        }
                    }}
                    onBack={() => {
                        if (challengePageData.previousData) {
                            handleNavigate('assignment-listing', challengePageData.previousData as any);
                        } else {
                            handleNavigate('dashboard');
                        }
                    }}
                />
            );
        }

        if (currentPage === 'student-coding' && pageData) {
            const studentCodingData = pageData as { challenge: any; module: any; course: any };
            return (
                <StudentCodingChallenge
                    challenge={studentCodingData.challenge}
                    module={studentCodingData.module}
                    course={studentCodingData.course}
                    onNavigate={handleNavigate}
                    onBack={() => handleNavigate('student-module', { course: studentCodingData.course, module: studentCodingData.module })}
                />
            );
        }

        if (currentPage === 'contest-play' && pageData) {
            return (
                <ContestParticipation
                    contest={(pageData as { contest: any }).contest}
                    onSubmit={() => handleNavigate('contests')}
                    onExit={() => handleNavigate('contests')}
                />
            );
        }

        return (
            <Layout
                currentPage={currentPage}
                onNavigate={handleNavigate}
                hideSidebar={['course-tests', 'course-modules', 'student-module', 'assignment-listing', 'topic-details', 'student-coding', 'coding-challenge-ui'].includes(currentPage)}
            >
                {currentPage === 'dashboard' && (
                    <>
                        {currentUser.role === 'student' && <StudentDashboard onNavigate={handleNavigate} />}
                        {currentUser.role === 'faculty' && <FacultyDashboard onNavigate={handleNavigate} />}
                        {currentUser.role === 'trainer' && <TrainerDashboard onNavigate={handleNavigate} />}
                        {currentUser.role === 'admin' && <AdminDashboard onNavigate={handleNavigate} />}
                    </>
                )}
                {currentPage === 'problems' && <ProblemsPage onSelectProblem={(problem) => handleNavigate('problem', problem)} />}
                {currentPage === 'leaderboard' && <Leaderboard />}
                {currentPage === 'messages' && <Messages />}
                {currentPage === 'profile' && currentUser.role === 'student' && <StudentProfile onNavigate={handleNavigate} />}
                {currentPage === 'profile' && currentUser.role === 'trainer' && <TrainerProfile onNavigate={handleNavigate} />}
                {currentPage === 'profile' && currentUser.role !== 'student' && currentUser.role !== 'trainer' && <AccountProfile onNavigate={handleNavigate} />}
                {currentPage === 'courses' && <CoursesPage onNavigate={handleNavigate} />}
                {currentPage === 'batches' && <BatchManagement onNavigate={handleNavigate} role={currentUser.role} initialFilters={pageData as any} />}
                {currentPage === 'manage-institutions' && <ManageInstitutions />}
                {currentPage === 'batch-years' && <BatchYears onNavigate={handleNavigate} />}
                {currentPage === 'trainer-invitation' && <MyTrainers onNavigate={handleNavigate} />}
                {currentPage === 'send-invitation' && <SendInvitation onNavigate={handleNavigate} />}
                {currentPage === 'billing' && <Billing />}
                {currentPage === 'coding-contest' && currentUser.role === 'admin' && <CodingContest />}
                {currentPage === 'contests' && currentUser.role === 'student' && <StudentContestDashboard onNavigate={handleNavigate} />}
                {currentPage === 'assessments-management' && <AssessmentManagement />}
                {currentPage === 'grading' && <GradingQueue onNavigate={handleNavigate} />}
                {currentPage === 'users' && <UserManagement onNavigate={handleNavigate} />}
                {currentPage === 'analytics' && <AnalyticsPage onNavigate={handleNavigate} />}
                {currentPage === 'attendance' && <AttendancePage />}
                {currentPage === 'settings' && currentUser.role === 'student' && <StudentSettings onNavigate={handleNavigate} />}
                {currentPage === 'settings' && currentUser.role !== 'student' && <AccountSettings />}
                {currentPage === 'tests' && (currentUser.role === 'admin' || currentUser.role === 'trainer') && <TestManagement onNavigate={handleNavigate} />}
                {currentPage === 'materials' && currentUser.role === 'admin' && <MaterialManagement />}
                {currentPage === 'materials' && currentUser.role === 'trainer' && <TrainerMaterials />}
                {currentPage === 'course-modules' && Boolean(pageData) && currentUser.role === 'student' && (
                    <CourseModulesPage
                        course={pageData as any}
                        onNavigate={handleNavigate}
                        userRole={currentUser.role as 'faculty' | 'trainer' | 'student'}
                        canLock={false}
                    />
                )}
                {currentPage === 'course-modules' && Boolean(pageData) && (currentUser.role === 'faculty' || currentUser.role === 'trainer') && (
                    <CourseModulesPage
                        course={pageData as any}
                        onNavigate={handleNavigate}
                        userRole={currentUser.role as 'faculty' | 'trainer' | 'student'}
                        canLock={currentUser.role === 'faculty' || currentUser.role === 'trainer'}
                    />
                )}

                {currentPage === 'test-monitoring' && Boolean(pageData) && (
                    <TestMonitoring
                        testName={(pageData as { testName: string }).testName}
                        batch={(pageData as { batch: string }).batch}
                        onNavigate={handleNavigate}
                        userRole={currentUser.role as 'faculty' | 'trainer'}
                    />
                )}
                {currentPage === 'trainer-compiler' && <ProgramizCompiler onBack={() => handleNavigate('dashboard')} />}
            </Layout>
        );
    };

    return (
        <>
            {renderContent()}
            <ContestNotificationPopup />
            <Toaster richColors position="top-right" />
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <ContestNotificationProvider>
                <AppContent />
            </ContestNotificationProvider>
        </AuthProvider>
    );
}
