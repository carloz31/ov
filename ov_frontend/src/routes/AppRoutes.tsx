import { LoginRoute } from '@/pages/auth/LoginRoute'
import { RoleSelectionRoute } from '@/pages/auth/RoleSelectionRoute'
import { SoloLocal } from './SoloLocal'
import { Navigate, Route, Routes } from 'react-router'
import { CounselorDashboardView } from '@/pages/counselor/CounselorDashboardView'
import { CounselorPortalModule } from '@/pages/counselor/CounselorPortalModule'
import { CounselorSettingsView } from '@/pages/counselor/CounselorSettingsView'
import { PrioritiesView } from '@/pages/counselor/PrioritiesView'
import { PublicationsView } from '@/pages/counselor/PublicationsView'
import { StudentDetailView } from '@/pages/counselor/StudentDetailView'
import { QuestionnaireDetailView } from '@/pages/counselor/QuestionnaireDetailView'
import { StudentRecordDetailView } from '@/pages/counselor/StudentRecordDetailView'
import { FamilyRecordDetailView } from '@/pages/counselor/FamilyRecordDetailView'
import { StudentsView } from '@/pages/counselor/StudentsView'
import { OccupationExplorationModule } from '@/pages/student/OccupationExplorationModule'
import { ExplorationCaseIntroPage } from '@/pages/student/ExplorationCaseIntroPage'
import { ForestFireCasePage } from '@/pages/student/ForestFireCasePage'
import { StudentCatalogView } from '@/pages/student/StudentCatalogView'
import { CareerDetailView } from '@/pages/student/CareerDetailView'
import { OccupationDetailView } from '@/pages/student/OccupationDetailView'
import { InstitutionDetailView } from '@/pages/student/InstitutionDetailView'
import { StudentPlansView } from '@/pages/student/StudentPlansView'
import { ProfileRoute } from '@/pages/student/ProfileRoute'
import { HelenaBookView } from '@/pages/student/HelenaBookView'
import { HelenaResultView } from '@/pages/student/HelenaResultView'
import { StudentShell } from '@/pages/student/StudentShell'
import { StudentThemeScope } from '@/pages/student/StudentThemeScope'
import { StudentActivitiesView } from '@/pages/student/StudentActivitiesView'
import { CaminoScreen } from '@/pages/student/CaminoScreen'
import { CiudadScreen } from '@/pages/student/CiudadScreen'
import { StudentFamilyConversationsView } from '@/pages/student/StudentFamilyConversationsView'
import { ParentActivitiesView } from '@/pages/parent/ParentActivitiesView'
import { ParentActivityView } from '@/pages/parent/ParentActivityView'
import { ParentCareerGuideView } from '@/pages/parent/ParentCareerGuideView'
import { ParentQuestionnaireDetailView } from '@/pages/parent/ParentQuestionnaireDetailView'
import { ParentChildrenView } from '@/pages/parent/ParentChildrenView'
import { ParentOverviewView } from '@/pages/parent/ParentOverviewView'
import { ParentPortalModule } from '@/pages/parent/ParentPortalModule'
import { parentChildren } from '@/features/parent/data/parentPortal'
import { appPaths } from './paths'
import { ResearchRoute } from '@/pages/student/ResearchRoute'
import { ResearchGuideView } from '@/pages/student/ResearchGuideView'
import { StudentJournalView } from '@/pages/student/StudentJournalView'
import { StudentSignalsView } from '@/pages/student/StudentSignalsView'
import { CommunityView } from '@/pages/student/CommunityView'
import { StudentResourcesView } from '@/pages/student/StudentResourcesView'
import { FamilyConversationsView } from '@/features/family-conversations/components/FamilyConversationsView'
function AppRoutes() {
  return (
    <Routes>
      <Route element={<LoginRoute />} path="/" />
      <Route element={<LoginRoute />} path={appPaths.login} />
      <Route element={<RoleSelectionRoute />} path={appPaths.roleSelection} />
      <Route
        element={
          <StudentThemeScope>
            <OccupationExplorationModule />
          </StudentThemeScope>
        }
        path="/student"
      >
        <Route element={<StudentShell />}>
          <Route element={<Navigate replace to={appPaths.student.missions} />} index />
          <Route element={<CiudadScreen />} path="exploration" />
          <Route element={<CaminoScreen />} path="missions" />
          <Route element={<StudentActivitiesView />} path="activities" />
          <Route
            element={
              <SoloLocal>
                <ResearchRoute />
              </SoloLocal>
            }
            path="research"
          />
          <Route
            element={
              <SoloLocal>
                <ResearchGuideView />
              </SoloLocal>
            }
            path="research/guion"
          />
          <Route element={<StudentJournalView />} path="journal" />
          <Route element={<StudentSignalsView />} path="journal/signal" />
          <Route
            element={
              <SoloLocal>
                <CommunityView />
              </SoloLocal>
            }
            path="community"
          />
          <Route element={<StudentResourcesView />} path="resources" />
          <Route
            element={
              <SoloLocal>
                <ResearchRoute />
              </SoloLocal>
            }
            path="investigations"
          />
          <Route element={<Navigate replace to={appPaths.student.passport} />} path="achievements" />
          <Route
            element={
              <SoloLocal>
                <StudentFamilyConversationsView />
              </SoloLocal>
            }
            path="conversations"
          />
          <Route element={<StudentCatalogView section="professions" />} path="catalog/professions" />
          <Route element={<StudentCatalogView section="careers" />} path="catalog/careers" />
          <Route element={<StudentCatalogView section="institutions" />} path="catalog/institutions" />
          <Route element={<StudentResourcesView />} path="testimonials" />
          <Route element={<CareerDetailView />} path="catalog/careers/:careerId" />
          <Route element={<OccupationDetailView />} path="catalog/professions/:occupationId" />
          <Route element={<InstitutionDetailView />} path="catalog/institutions/:institutionId" />
          <Route element={<ProfileRoute />} path="profile" />
          <Route element={<HelenaBookView />} path="profile/helena" />
          <Route element={<HelenaResultView />} path="profile/helena/:pagina" />
          <Route element={<StudentPlansView />} path="profile/decisions" />
          <Route element={<Navigate replace to={appPaths.student.exploration} />} path="*" />
        </Route>
        <Route
          element={
            <SoloLocal>
              <ExplorationCaseIntroPage />
            </SoloLocal>
          }
          path="cases/:caseId"
        />
        <Route
          element={
            <SoloLocal>
              <ForestFireCasePage />
            </SoloLocal>
          }
          path="cases/:caseId/play"
        />
      </Route>

      <Route element={<ParentPortalModule />} path="/parent">
        <Route element={<Navigate replace to={appPaths.parent.overview} />} index />
        <Route element={<ParentOverviewView />} path="overview" />
        <Route element={<ParentActivitiesView />} path="activities" />
        <Route element={<FamilyConversationsView audience="parent" />} path="conversations" />
        <Route element={<ParentActivityView />} path="activities/:activityId" />
        <Route
          element={<Navigate replace to={appPaths.parent.child(parentChildren[0].id)} />}
          path="children"
        />
        <Route element={<ParentChildrenView />} path="children/:childId" />
        <Route
          element={<ParentQuestionnaireDetailView />}
          path="children/:childId/questionnaires/:questionnaireId"
        />
        <Route element={<ParentCareerGuideView />} path="careers" />
        <Route element={<Navigate replace to={appPaths.parent.overview} />} path="*" />
      </Route>

      <Route element={<CounselorPortalModule />} path="/counselor">
        <Route element={<Navigate replace to={appPaths.counselor.home} />} index />
        <Route element={<CounselorDashboardView />} path="home" />
        <Route element={<StudentsView />} path="students" />
        <Route element={<PrioritiesView />} path="students/priorities" />
        <Route
          element={<QuestionnaireDetailView />}
          path="students/:studentId/questionnaires/:questionnaireId"
        />
        <Route element={<StudentDetailView />} path="students/:studentId" />
        <Route element={<StudentRecordDetailView />} path="students/:studentId/records/:recordId" />
        <Route element={<FamilyRecordDetailView />} path="students/:studentId/family-records/:activityId" />
        <Route element={<PublicationsView />} path="publications" />
        <Route element={<PublicationsView />} path="publications/interviews/:interviewId" />
        <Route element={<PrioritiesView />} path="priorities" />
        <Route element={<CounselorSettingsView />} path="settings" />
        <Route element={<Navigate replace to={appPaths.counselor.home} />} path="dashboard" />
        <Route element={<Navigate replace to={appPaths.counselor.students} />} path="classrooms" />
        <Route element={<Navigate replace to={appPaths.counselor.students} />} path="families" />
        <Route element={<Navigate replace to={appPaths.counselor.students} />} path="teachers" />
        <Route element={<Navigate replace to={appPaths.counselor.students} />} path="reports" />
        <Route element={<Navigate replace to={appPaths.counselor.priorities} />} path="plan" />
        <Route element={<Navigate replace to={appPaths.counselor.reviews} />} path="adventure" />
        <Route element={<Navigate replace to={appPaths.counselor.home} />} path="messages/*" />
        <Route element={<Navigate replace to={appPaths.counselor.home} />} path="*" />
      </Route>
      <Route element={<Navigate replace to={appPaths.home} />} path="*" />
    </Routes>
  )
}

export { AppRoutes }
