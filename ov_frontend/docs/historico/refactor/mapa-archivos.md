# Mapa de archivos del refactor de `ov_frontend`

> Anexo de `docs/spec-refactor-estructura.md`. Generado a partir de la rama `iteracion-1` (commit `1bbacce`). Cubre **todos** los archivos de `src/`: 337 archivos, 272 se mueven o renombran, 33 se quedan donde están y 32 se eliminan (29 de código, con 9.422 líneas, y los 3 de la plantilla en src/assets/). La decisión D1 de la spec explica por qué se eliminan.

Cómo leerlo:

- Se mueve con `git mv` para conservar el historial. En Windows, un cambio que solo altera mayúsculas (`drawer.tsx` → `Drawer.tsx`) se hace en dos pasos: `git mv drawer.tsx drawer.tmp.tsx` y luego `git mv drawer.tmp.tsx Drawer.tsx`.
- El nombre del archivo puede cambiar; **los nombres exportados no** (componentes, funciones, tipos y constantes se llaman igual que antes).
- Los archivos nuevos que no salen de uno existente (los servicios por grupo de rutas, `routes/SoloLocal.tsx`, etc.) están en la spec, no aquí.
- «Se queda» significa misma ruta; solo cambian sus imports.

## src/ (raíz)

| Origen | Destino | Líneas |
|---|---|---:|
| `src/App.tsx` | se queda | 12 |
| `src/index.css` | se queda | 66 |
| `src/main.tsx` | se queda | 18 |

## src/components/common/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/components/GuideDialogue.tsx` | `src/components/common/GuideDialogue.tsx` | 129 |
| `src/components/PageHeader.tsx` | `src/components/common/PageHeader.tsx` | 25 |
| `src/components/ThemeScope.tsx` | `src/components/common/ThemeScope.tsx` | 17 |

## src/components/layout/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/components/layout/AppNavMain.tsx` | se queda | 92 |
| `src/components/layout/AppNavUser.tsx` | se queda | 91 |
| `src/components/layout/AppShell.tsx` | se queda | 66 |
| `src/components/layout/AppSidebar.tsx` | se queda | 71 |
| `src/components/layout/AppTopBar.tsx` | se queda | 32 |
| `src/components/layout/navigation.ts` | se queda | 16 |

## src/components/staff/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/components/staff/StaffPatterns.tsx` | se queda | 102 |

## src/components/student/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/student-experience/player/CharacterAvatar.tsx` | `src/components/student/CharacterAvatar.tsx` | 22 |
| `src/features/student-experience/discovery/CollectionSlot.tsx` | `src/components/student/CollectionSlot.tsx` | 27 |
| `src/features/student-experience/discovery/DiscoverySheetContent.tsx` | `src/components/student/DiscoverySheetContent.tsx` | 14 |
| `src/features/student-experience/discovery/FavoriteButton.tsx` | `src/components/student/FavoriteButton.tsx` | 29 |
| `src/features/student-experience/player/LumiMedallion.tsx` | `src/components/student/LumiMedallion.tsx` | 23 |
| `src/features/student-experience/discovery/Parchment.tsx` | `src/components/student/Parchment.tsx` | 20 |
| `src/features/student-experience/discovery/PendingNotice.tsx` | `src/components/student/PendingNotice.tsx` | 16 |
| `src/features/student-experience/discovery/Seal.tsx` | `src/components/student/Seal.tsx` | 17 |
| `src/features/student-experience/modules/StudentBrand.tsx` | `src/components/student/StudentBrand.tsx` | 15 |
| `src/features/student-experience/discovery/TrailBar.tsx` | `src/components/student/TrailBar.tsx` | 32 |

## src/components/ui/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/components/ui/Accordion.tsx` | se queda | 47 |
| `src/components/ui/Alert.tsx` | se queda | 19 |
| `src/components/ui/Avatar.tsx` | se queda | 38 |
| `src/components/ui/Badge.tsx` | se queda | 54 |
| `src/components/ui/Breadcrumb.tsx` | se queda | 95 |
| `src/components/ui/Button.tsx` | se queda | 55 |
| `src/components/ui/Card.tsx` | se queda | 38 |
| `src/components/ui/Checkbox.tsx` | se queda | 23 |
| `src/components/ui/Collapsible.tsx` | se queda | 9 |
| `src/components/ui/Dialog.tsx` | se queda | 61 |
| `src/components/ui/drawer.tsx` | `src/components/ui/Drawer.tsx` | 104 |
| `src/components/ui/DropdownMenu.tsx` | se queda | 189 |
| `src/components/ui/Input.tsx` | se queda | 22 |
| `src/components/ui/Progress.tsx` | se queda | 44 |
| `src/components/ui/select.tsx` | `src/components/ui/Select.tsx` | 148 |
| `src/components/ui/Separator.tsx` | se queda | 24 |
| `src/components/ui/Sheet.tsx` | se queda | 129 |
| `src/components/ui/Sidebar.tsx` | se queda | 694 |
| `src/components/ui/Skeleton.tsx` | se queda | 7 |
| `src/components/ui/Status.tsx` | se queda | 63 |
| `src/components/ui/Table.tsx` | se queda | 26 |
| `src/components/ui/Tabs.tsx` | se queda | 41 |
| `src/components/ui/Tooltip.tsx` | se queda | 32 |

## src/config/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/servidor/config.ts` | `src/config/env.ts` | 10 |
| `src/features/occupation-exploration/lib/StudentDemoScope.ts` | `src/config/studentDemoScope.ts` | 14 |

## src/context/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/occupation-exploration/OccupationExplorationContext.ts` | `src/context/occupationExplorationContext.ts` | 23 |

## src/data/activities/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/missions/data/catalogo.json` | `src/data/activities/catalogo.json` | 220 |
| `src/features/missions/content.ts` | `src/data/activities/content.ts` | 54 |
| `src/features/missions/data/encuentro_mitos.json` | `src/data/activities/encuentro_mitos.json` | 562 |
| `src/features/missions/data/instrumento_mara.json` | `src/data/activities/instrumento_mara.json` | 289 |
| `src/features/missions/data/pad_01_acompanar.json` | `src/data/activities/pad_01_acompanar.json` | 524 |
| `src/features/missions/data/pad_02_informacion.json` | `src/data/activities/pad_02_informacion.json` | 438 |
| `src/features/student-experience/reflection/config.ts` | `src/data/activities/reflectionConfig.ts` | 327 |
| `src/features/missions/data/registro_linea_tiempo.json` | `src/data/activities/registro_linea_tiempo.json` | 330 |
| `src/features/missions/data/registro_mis_pregones.json` | `src/data/activities/registro_mis_pregones.json` | 65 |
| `src/features/missions/standardActivities.ts` | `src/data/activities/standardActivities.ts` | 287 |

## src/data/catalog/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/occupation-exploration/data/AdditionalOccupationCatalogData.ts` | `src/data/catalog/additionalOccupations.ts` | 151 |
| `src/features/occupation-exploration/data/ExplorationCatalogData.ts` | `src/data/catalog/careersAndInstitutions.ts` | 118 |
| `src/features/occupation-exploration/data/OccupationExplorationData.ts` | `src/data/catalog/occupations.ts` | 377 |

## src/data/content/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/occupation-exploration/data/AdventureData.ts` | `src/data/content/adventure.ts` | 321 |
| `src/features/student-experience/challenges/data.ts` | `src/data/content/challenges.ts` | 173 |
| `src/features/student-experience/characters.ts` | `src/data/content/characters.ts` | 15 |
| `src/features/family-conversations/FamilyConversationData.ts` | `src/data/content/familyConversations.ts` | 183 |
| `src/features/occupation-exploration/data/ForestFireCaseData.ts` | `src/data/content/forestFireCase.ts` | 537 |
| `src/features/student-experience/guide-texts.ts` | `src/data/content/guideTexts.ts` | 99 |
| `src/features/occupation-exploration/data/JournalData.ts` | `src/data/content/journalPrompts.ts` | 194 |
| `src/features/student-experience/research/researchData.ts` | `src/data/content/research.ts` | 138 |

## src/data/demo/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/counselor-portal/profile/data.ts` | `src/data/demo/studentProfiles.ts` | 597 |

## src/features/activities/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/student-experience/player/CheckOption.tsx` | `src/features/activities/components/CheckOption.tsx` | 46 |
| `src/features/student-experience/player/ContentBlocks.tsx` | `src/features/activities/components/ContentBlocks.tsx` | 144 |
| `src/features/student-experience/player/DialogueBox.tsx` | `src/features/activities/components/DialogueBox.tsx` | 79 |
| `src/features/student-experience/player/FinishScreen.tsx` | `src/features/activities/components/FinishScreen.tsx` | 204 |
| `src/features/student-experience/player/InlineDialogue.tsx` | `src/features/activities/components/InlineDialogue.tsx` | 18 |
| `src/features/missions/JourneyContent.tsx` | `src/features/activities/components/JourneyContent.tsx` | 292 |
| `src/features/student-experience/player/MaraInteractionPlayer.tsx` | `src/features/activities/components/MaraInteractionPlayer.tsx` | 142 |
| `src/features/student-experience/player/PlayerAmbient.tsx` | `src/features/activities/components/PlayerAmbient.tsx` | 11 |
| `src/features/student-experience/player/PlayerSoundButton.tsx` | `src/features/activities/components/PlayerSoundButton.tsx` | 17 |
| `src/features/student-experience/player/PlayerTopBar.tsx` | `src/features/activities/components/PlayerTopBar.tsx` | 107 |
| `src/features/student-experience/player/ResourceSheet.tsx` | `src/features/activities/components/ResourceSheet.tsx` | 138 |
| `src/features/student-experience/player/RewardCard.tsx` | `src/features/activities/components/RewardCard.tsx` | 55 |
| `src/features/student-experience/player/StudentActivityPlayer.tsx` | `src/features/activities/components/StudentActivityPlayer.tsx` | 574 |
| `src/features/student-experience/challenges/ChallengePlayer.tsx` | `src/features/activities/components/challenges/ChallengePlayer.tsx` | 367 |
| `src/features/student-experience/player/followup/FollowUp.tsx` | `src/features/activities/components/followup/FollowUp.tsx` | 271 |
| `src/features/student-experience/player/nodes/ChoiceNode.tsx` | `src/features/activities/components/nodes/ChoiceNode.tsx` | 40 |
| `src/features/student-experience/player/nodes/ItemNode.tsx` | `src/features/activities/components/nodes/ItemNode.tsx` | 69 |
| `src/features/student-experience/player/nodes/MatrixNode.tsx` | `src/features/activities/components/nodes/MatrixNode.tsx` | 183 |
| `src/features/student-experience/player/nodes/QuestionNode.tsx` | `src/features/activities/components/nodes/QuestionNode.tsx` | 173 |
| `src/features/student-experience/player/nodes/ResultNode.tsx` | `src/features/activities/components/nodes/ResultNode.tsx` | 87 |
| `src/features/student-experience/player/nodes/SlideNode.tsx` | `src/features/activities/components/nodes/SlideNode.tsx` | 45 |
| `src/features/student-experience/player/nodes/SubmissionNode.tsx` | `src/features/activities/components/nodes/SubmissionNode.tsx` | 275 |
| `src/features/student-experience/reflection/AdditionalReveal.tsx` | `src/features/activities/components/reflection/AdditionalReveal.tsx` | 103 |
| `src/features/student-experience/reflection/QuestionMemory.tsx` | `src/features/activities/components/reflection/QuestionMemory.tsx` | 83 |
| `src/features/student-experience/player/checks.ts` | `src/features/activities/lib/checks.ts` | 30 |
| `src/features/student-experience/player/followup/followUpService.ts` | `src/features/activities/lib/followUpService.ts` | 69 |
| `src/features/student-experience/reflection/additional.ts` | `src/features/activities/lib/reflection/additional.ts` | 11 |
| `src/features/student-experience/reflection/evaluation.ts` | `src/features/activities/lib/reflection/evaluation.ts` | 162 |
| `src/features/student-experience/reflection/personalization.ts` | `src/features/activities/lib/reflection/personalization.ts` | 164 |
| `src/features/student-experience/reflection/provider.ts` | `src/features/activities/lib/reflection/provider.ts` | 125 |
| `src/features/student-experience/player/followup/responseCondenser.ts` | `src/features/activities/lib/responseCondenser.ts` | 38 |
| `src/features/student-experience/player/followup/followUpStore.ts` | `src/features/activities/store/followUpStore.ts` | 172 |

## src/features/adventure/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/student-experience/map/ActivityDrawer.tsx` | `src/features/adventure/components/ActivityDrawer.tsx` | 172 |
| `src/features/student-experience/map/AdventurePanel.tsx` | `src/features/adventure/components/AdventurePanel.tsx` | 286 |
| `src/features/student-experience/map/BlockSign.tsx` | `src/features/adventure/components/BlockSign.tsx` | 26 |
| `src/features/student-experience/map/CityLocked.tsx` | `src/features/adventure/components/CityLocked.tsx` | 67 |
| `src/features/student-experience/map/MapCanvas.tsx` | `src/features/adventure/components/MapCanvas.tsx` | 286 |
| `src/features/student-experience/map/MapControls.tsx` | `src/features/adventure/components/MapControls.tsx` | 23 |
| `src/features/student-experience/map/MapNode.tsx` | `src/features/adventure/components/MapNode.tsx` | 72 |
| `src/features/student-experience/map/MapPath.tsx` | `src/features/adventure/components/MapPath.tsx` | 76 |
| `src/features/student-experience/map/MapScreenLayout.tsx` | `src/features/adventure/components/MapScreenLayout.tsx` | 337 |
| `src/features/student-experience/modules/StudentModuleLayout.tsx` | `src/features/adventure/components/StudentModuleLayout.tsx` | 46 |
| `src/features/student-experience/modules/StudentUserMenu.tsx` | `src/features/adventure/components/StudentUserMenu.tsx` | 94 |
| `src/features/student-experience/map/ZoneSwitch.tsx` | `src/features/adventure/components/ZoneSwitch.tsx` | 51 |
| `src/features/student-experience/map/ZoneTransition.tsx` | `src/features/adventure/components/ZoneTransition.tsx` | 29 |
| `src/features/student-experience/map/ZoomControls.tsx` | `src/features/adventure/components/ZoomControls.tsx` | 56 |
| `src/features/student-experience/overlays/BadgeToast.tsx` | `src/features/adventure/components/overlays/BadgeToast.tsx` | 36 |
| `src/features/student-experience/overlays/CheckInDialog.tsx` | `src/features/adventure/components/overlays/CheckInDialog.tsx` | 111 |
| `src/features/student-experience/overlays/LumiOverlay.tsx` | `src/features/adventure/components/overlays/LumiOverlay.tsx` | 122 |
| `src/features/student-experience/overlays/NoveltiesMenu.tsx` | `src/features/adventure/components/overlays/NoveltiesMenu.tsx` | 158 |
| `src/features/student-experience/overlays/OverlayQueue.tsx` | `src/features/adventure/components/overlays/OverlayQueue.tsx` | 197 |
| `src/features/student-experience/overlays/UnlockToast.tsx` | `src/features/adventure/components/overlays/UnlockToast.tsx` | 47 |
| `src/features/student-experience/overlays/overlay-context.ts` | `src/features/adventure/context/overlayContext.ts` | 44 |
| `src/features/student-experience/overlays/checkIn.ts` | `src/features/adventure/lib/checkIn.ts` | 54 |
| `src/features/student-experience/map/geometry.ts` | `src/features/adventure/lib/geometry.ts` | 72 |
| `src/features/student-experience/map/mapPoints.ts` | `src/features/adventure/lib/mapPoints.ts` | 623 |
| `src/features/student-experience/map/navigation.ts` | `src/features/adventure/lib/navigation.ts` | 17 |
| `src/features/student-experience/overlays/unlocks.ts` | `src/features/adventure/lib/unlocks.ts` | 157 |

## src/features/auth/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/access/DemoAccessGate.tsx` | `src/features/auth/components/DemoAccessGate.tsx` | 13 |
| `src/features/access/LoginScreen.tsx` | `src/features/auth/components/LoginScreen.tsx` | 147 |
| `src/features/role-selection/components/RoleOptionCard.tsx` | `src/features/auth/components/RoleOptionCard.tsx` | 34 |
| `src/features/role-selection/RoleSelectionScreen.tsx` | `src/features/auth/components/RoleSelectionScreen.tsx` | 55 |
| `src/features/role-selection/data/RoleSelectionData.ts` | `src/features/auth/data/roleOptions.ts` | 31 |
| `src/features/access/demoAccess.ts` | `src/features/auth/lib/demoAccess.ts` | 37 |
| `src/features/access/access.css` | `src/features/auth/styles/access.css` | 386 |
| `src/features/role-selection/types/RoleSelectionTypes.ts` | `src/features/auth/types.ts` | 14 |

## src/features/backpack/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/student-experience/backpack/BackpackViewerFrame.tsx` | `src/features/backpack/components/BackpackViewerFrame.tsx` | 11 |
| `src/features/student-experience/backpack/challengeResources.ts` | `src/features/backpack/lib/challengeResources.ts` | 44 |
| `src/features/occupation-exploration/lib/TravelerResources.ts` | `src/features/backpack/lib/travelerResources.ts` | 205 |
| `src/features/student-experience/backpack/backpack.css` | `src/features/backpack/styles/backpack.css` | 366 |

## src/features/cases/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/occupation-exploration/ExplorationCaseIntroView.tsx` | `src/features/cases/components/ExplorationCaseIntroView.tsx` | 192 |
| `src/features/occupation-exploration/components/ForestFireCaseHeader.tsx` | `src/features/cases/components/ForestFireCaseHeader.tsx` | 86 |
| `src/features/occupation-exploration/components/ForestFireCaseProgress.tsx` | `src/features/cases/components/ForestFireCaseProgress.tsx` | 56 |
| `src/features/occupation-exploration/ForestFireCaseView.tsx` | `src/features/cases/components/ForestFireCaseView.tsx` | 761 |
| `src/features/occupation-exploration/ForestFireExtraScreens.tsx` | `src/features/cases/components/ForestFireExtraScreens.tsx` | 335 |
| `src/features/occupation-exploration/components/ForestFireProfessionalPanel.tsx` | `src/features/cases/components/ForestFireProfessionalPanel.tsx` | 283 |
| `src/features/occupation-exploration/components/ForestFireScene.tsx` | `src/features/cases/components/ForestFireScene.tsx` | 265 |
| `src/features/occupation-exploration/components/OccupationDetailDialog.tsx` | `src/features/cases/components/OccupationDetailDialog.tsx` | 96 |
| `src/features/occupation-exploration/lib/ForestFireCaseLogic.ts` | `src/features/cases/lib/forestFireCaseLogic.ts` | 124 |
| `src/features/occupation-exploration/lib/ForestFireCaseOutcome.ts` | `src/features/cases/lib/forestFireCaseOutcome.ts` | 14 |
| `src/features/occupation-exploration/lib/ForestFireSceneGeometry.ts` | `src/features/cases/lib/forestFireSceneGeometry.ts` | 45 |
| `src/features/occupation-exploration/components/forest-fire-progress.css` | `src/features/cases/styles/forest-fire-progress.css` | 67 |
| `src/features/occupation-exploration/forest-fire-workspace.css` | `src/features/cases/styles/forest-fire-workspace.css` | 990 |
| `src/features/occupation-exploration/forest-fire.css` | `src/features/cases/styles/forest-fire.css` | 512 |

## src/features/counselor/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/counselor-portal/classroom/ClassroomShared.tsx` | `src/features/counselor/components/ClassroomShared.tsx` | 178 |
| `src/features/counselor-portal/components/CounselorShared.tsx` | `src/features/counselor/components/CounselorShared.tsx` | 131 |
| `src/features/counselor-portal/components/ResourcePreviews.tsx` | `src/features/counselor/components/ResourcePreviews.tsx` | 491 |
| `src/features/counselor-portal/CounselorPortalContext.ts` | `src/features/counselor/context/counselorPortalContext.ts` | 11 |
| `src/features/counselor-portal/data/CounselorPortalData.ts` | `src/features/counselor/data/counselorPortal.ts` | 642 |
| `src/features/counselor-portal/data/StudentsExampleData.ts` | `src/features/counselor/data/exampleStudents.ts` | 31 |
| `src/features/counselor-portal/data/InterviewDetails.ts` | `src/features/counselor/data/interviewDetails.ts` | 106 |
| `src/features/counselor-portal/priorities/usePrioritySettings.ts` | `src/features/counselor/hooks/usePrioritySettings.ts` | 14 |
| `src/features/counselor-portal/classroom/useSelectedSalon.ts` | `src/features/counselor/hooks/useSelectedSalon.ts` | 39 |
| `src/features/counselor-portal/classroom/selectors.ts` | `src/features/counselor/lib/classroomSelectors.ts` | 318 |
| `src/features/counselor-portal/CounselorPortalSelectors.ts` | `src/features/counselor/lib/counselorPortalSelectors.ts` | 327 |
| `src/features/counselor-portal/InterviewSelectors.ts` | `src/features/counselor/lib/interviewSelectors.ts` | 74 |
| `src/features/counselor-portal/CounselorPortalState.tsx` | `src/features/counselor/store/CounselorPortalState.tsx` | 10 |
| `src/features/counselor-portal/CounselorPortalReducer.ts` | `src/features/counselor/store/counselorPortalReducer.ts` | 80 |
| `src/features/counselor-portal/priorities/PrioritySettings.ts` | `src/features/counselor/store/prioritySettings.ts` | 141 |
| `src/features/counselor-portal/types/CounselorPortalTypes.ts` | `src/features/counselor/types.ts` | 209 |

## src/features/discovery/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/student-experience/catalog/AtlasNavigation.tsx` | `src/features/discovery/components/AtlasNavigation.tsx` | 25 |
| `src/features/student-experience/catalog/CatalogNavigation.tsx` | `src/features/discovery/components/CatalogNavigation.tsx` | 27 |
| `src/features/student-experience/discovery/DiscoveryStage.tsx` | `src/features/discovery/components/DiscoveryStage.tsx` | 30 |
| `src/features/student-experience/profile/PassportBadgeDialog.tsx` | `src/features/discovery/components/PassportBadgeDialog.tsx` | 189 |
| `src/features/student-experience/plans/PlanCard.tsx` | `src/features/discovery/components/PlanCard.tsx` | 86 |
| `src/features/student-experience/profile/StudentPassportView.tsx` | `src/features/discovery/components/StudentPassportView.tsx` | 168 |
| `src/features/student-experience/catalog/UnexpectedPlace.tsx` | `src/features/discovery/components/UnexpectedPlace.tsx` | 64 |
| `src/features/student-experience/research/AlliesSheet.tsx` | `src/features/discovery/components/research/AlliesSheet.tsx` | 42 |
| `src/features/student-experience/research/GuideSheet.tsx` | `src/features/discovery/components/research/GuideSheet.tsx` | 44 |
| `src/features/student-experience/research/InterviewCard.tsx` | `src/features/discovery/components/research/InterviewCard.tsx` | 105 |
| `src/features/student-experience/research/InterviewDetail.tsx` | `src/features/discovery/components/research/InterviewDetail.tsx` | 188 |
| `src/features/student-experience/research/PublishDialog.tsx` | `src/features/discovery/components/research/PublishDialog.tsx` | 140 |
| `src/features/student-experience/research/ReportDialog.tsx` | `src/features/discovery/components/research/ReportDialog.tsx` | 77 |
| `src/features/student-experience/catalog/useCatalogVisit.ts` | `src/features/discovery/hooks/useCatalogVisit.ts` | 18 |
| `src/features/occupation-exploration/lib/AdventureAchievements.ts` | `src/features/discovery/lib/achievements.ts` | 170 |
| `src/features/student-experience/catalog/catalogDetails.ts` | `src/features/discovery/lib/catalogDetails.ts` | 195 |
| `src/features/student-experience/catalog/catalogSelectors.ts` | `src/features/discovery/lib/catalogSelectors.ts` | 51 |
| `src/features/student-experience/profile/helenaPages.ts` | `src/features/discovery/lib/helenaPages.ts` | 196 |
| `src/features/student-experience/profile/passport.ts` | `src/features/discovery/lib/passport.ts` | 181 |
| `src/features/student-experience/plans/plans.ts` | `src/features/discovery/lib/plans.ts` | 64 |
| `src/features/student-experience/research/research.ts` | `src/features/discovery/lib/research.ts` | 117 |
| `src/features/student-experience/catalog/unexpected.ts` | `src/features/discovery/lib/unexpected.ts` | 56 |
| `src/features/student-experience/profile/passport.css` | `src/features/discovery/styles/passport.css` | 394 |

## src/features/family-conversations/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/family-conversations/FamilyConversationsView.tsx` | `src/features/family-conversations/components/FamilyConversationsView.tsx` | 642 |

## src/features/journal/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/student-experience/journal/DailyQuestionCard.tsx` | `src/features/journal/components/DailyQuestionCard.tsx` | 129 |
| `src/features/occupation-exploration/components/JournalEntryCard.tsx` | `src/features/journal/components/JournalEntryCard.tsx` | 31 |
| `src/features/student-experience/journal/LumiBondPanel.tsx` | `src/features/journal/components/LumiBondPanel.tsx` | 115 |
| `src/features/occupation-exploration/components/LumiJournalPanel.tsx` | `src/features/journal/components/LumiJournalPanel.tsx` | 183 |
| `src/features/student-experience/journal/lumiMemories.ts` | `src/features/journal/data/lumiMemories.ts` | 10 |
| `src/features/student-experience/journal/lumiBond.ts` | `src/features/journal/lib/lumiBond.ts` | 51 |
| `src/features/occupation-exploration/lib/LumiSuggestions.ts` | `src/features/journal/lib/lumiSuggestions.ts` | 69 |
| `src/features/student-experience/journal/journal.css` | `src/features/journal/styles/journal.css` | 731 |

## src/features/parent/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/parent-portal/components/ParentActivityCard.tsx` | `src/features/parent/components/ParentActivityCard.tsx` | 68 |
| `src/features/parent-portal/components/ParentContent.tsx` | `src/features/parent/components/ParentContent.tsx` | 161 |
| `src/features/parent-portal/components/ParentResourceDialog.tsx` | `src/features/parent/components/ParentResourceDialog.tsx` | 47 |
| `src/features/parent-portal/ParentPortalContext.ts` | `src/features/parent/context/parentPortalContext.ts` | 12 |
| `src/features/parent-portal/data/ParentMotivation.ts` | `src/features/parent/data/parentMotivation.ts` | 28 |
| `src/features/parent-portal/data/ParentPortalData.ts` | `src/features/parent/data/parentPortal.ts` | 50 |
| `src/features/parent-portal/missionLogic.ts` | `src/features/parent/lib/missionLogic.ts` | 221 |
| `src/features/parent-portal/selectors.ts` | `src/features/parent/lib/selectors.ts` | 69 |
| `src/features/parent-portal/missionStore.ts` | `src/features/parent/store/parentJourneyStore.ts` | 98 |
| `src/features/parent-portal/components/parent-activities.css` | `src/features/parent/styles/parent-activities.css` | 697 |
| `src/features/parent-portal/types/ParentPortalTypes.ts` | `src/features/parent/types.ts` | 12 |

## src/features/student-tracking/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/counselor-portal/profile/DimensionCards.tsx` | `src/features/student-tracking/components/DimensionCards.tsx` | 77 |
| `src/features/counselor-portal/profile/ProfileSections.tsx` | `src/features/student-tracking/components/ProfileSections.tsx` | 640 |
| `src/features/counselor-portal/profile/ProfileShared.tsx` | `src/features/student-tracking/components/ProfileShared.tsx` | 214 |
| `src/features/counselor-portal/profile/QuestionnaireComparison.tsx` | `src/features/student-tracking/components/QuestionnaireComparison.tsx` | 105 |
| `src/features/counselor-portal/profile/Questionnaires.tsx` | `src/features/student-tracking/components/Questionnaires.tsx` | 408 |
| `src/features/counselor-portal/profile/SecuritySection.tsx` | `src/features/student-tracking/components/SecuritySection.tsx` | 214 |
| `src/features/counselor-portal/profile/StudentProfileView.tsx` | `src/features/student-tracking/components/StudentProfileView.tsx` | 214 |
| `src/features/counselor-portal/profile/navigation.ts` | `src/features/student-tracking/lib/navigation.ts` | 35 |
| `src/features/counselor-portal/profile/presentation.ts` | `src/features/student-tracking/lib/presentation.ts` | 13 |
| `src/features/counselor-portal/profile/selectors.ts` | `src/features/student-tracking/lib/selectors.ts` | 318 |

## src/hooks/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/hooks/use-mobile.tsx` | `src/hooks/useIsMobile.ts` | 19 |
| `src/features/occupation-exploration/lib/useLumiNow.ts` | `src/hooks/useLumiNow.ts` | 16 |
| `src/features/student-experience/discovery/useReturnFocus.ts` | `src/hooks/useReturnFocus.ts` | 22 |
| `src/features/student-experience/overlays/useTypewriter.ts` | `src/hooks/useTypewriter.ts` | 38 |

## src/lib/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/missions/logic.ts` | `src/lib/activities/logic.ts` | 274 |
| `src/features/missions/validation.ts` | `src/lib/activities/validation.ts` | 18 |
| `src/features/student-experience/challenges/logic.ts` | `src/lib/challenges.ts` | 142 |
| `src/features/occupation-exploration/lib/ExplorationAssets.ts` | `src/lib/explorationAssets.ts` | 5 |
| `src/features/occupation-exploration/lib/LumiFriendship.ts` | `src/lib/lumiFriendship.ts` | 92 |
| `src/features/student-experience/discovery/persistentStore.ts` | `src/lib/persistentStore.ts` | 69 |
| `src/features/servidor/adaptadores.ts` | `src/lib/servidor/adaptadores.ts` | 366 |
| `src/features/student-experience/views.ts` | `src/lib/studentViews.ts` | 98 |
| `src/lib/Utils.ts` | `src/lib/utils.ts` | 6 |

## src/pages/counselor/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/counselor-portal/CounselorDashboardView.tsx` | `src/pages/counselor/CounselorDashboardView.tsx` | 386 |
| `src/features/counselor-portal/CounselorPortalModule.tsx` | `src/pages/counselor/CounselorPortalModule.tsx` | 87 |
| `src/features/counselor-portal/CounselorSettingsView.tsx` | `src/pages/counselor/CounselorSettingsView.tsx` | 70 |
| `src/features/counselor-portal/FamilyRecordDetailView.tsx` | `src/pages/counselor/FamilyRecordDetailView.tsx` | 92 |
| `src/features/counselor-portal/PrioritiesView.tsx` | `src/pages/counselor/PrioritiesView.tsx` | 381 |
| `src/features/counselor-portal/PublicationsView.tsx` | `src/pages/counselor/PublicationsView.tsx` | 312 |
| `src/features/counselor-portal/StudentDetailView.tsx` | `src/pages/counselor/StudentDetailView.tsx` | 1484 |
| `src/features/counselor-portal/StudentRecordDetailView.tsx` | `src/pages/counselor/StudentRecordDetailView.tsx` | 148 |
| `src/features/counselor-portal/StudentsView.tsx` | `src/pages/counselor/StudentsView.tsx` | 299 |

## src/pages/parent/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/parent-portal/ParentActivitiesView.tsx` | `src/pages/parent/ParentActivitiesView.tsx` | 67 |
| `src/features/parent-portal/ParentActivityView.tsx` | `src/pages/parent/ParentActivityView.tsx` | 651 |
| `src/features/parent-portal/ParentCareerGuideView.tsx` | `src/pages/parent/ParentCareerGuideView.tsx` | 49 |
| `src/features/parent-portal/ParentChildrenView.tsx` | `src/pages/parent/ParentChildrenView.tsx` | 10 |
| `src/features/parent-portal/ParentOverviewView.tsx` | `src/pages/parent/ParentOverviewView.tsx` | 354 |
| `src/features/parent-portal/ParentPortalModule.tsx` | `src/pages/parent/ParentPortalModule.tsx` | 90 |
| `src/features/parent-portal/ParentQuestionnaireDetailView.tsx` | `src/pages/parent/ParentQuestionnaireDetailView.tsx` | 76 |

## src/pages/student/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/student-experience/map/CaminoScreen.tsx` | `src/pages/student/CaminoScreen.tsx` | 44 |
| `src/features/student-experience/catalog/CareerDetailView.tsx` | `src/pages/student/CareerDetailView.tsx` | 192 |
| `src/features/occupation-exploration/OccupationExplorationPages.tsx` | `src/pages/student/CasePages.tsx` | 115 |
| `src/features/student-experience/map/CiudadScreen.tsx` | `src/pages/student/CiudadScreen.tsx` | 73 |
| `src/features/occupation-exploration/CommunityView.tsx` | `src/pages/student/CommunityView.tsx` | 265 |
| `src/features/student-experience/profile/HelenaBookView.tsx` | `src/pages/student/HelenaBookView.tsx` | 368 |
| `src/features/student-experience/catalog/InstitutionDetailView.tsx` | `src/pages/student/InstitutionDetailView.tsx` | 103 |
| `src/features/student-experience/catalog/OccupationDetailView.tsx` | `src/pages/student/OccupationDetailView.tsx` | 205 |
| `src/features/occupation-exploration/OccupationExplorationModule.tsx` | `src/pages/student/OccupationExplorationModule.tsx` | 50 |
| `src/features/student-experience/research/ResearchGuideView.tsx` | `src/pages/student/ResearchGuideView.tsx` | 356 |
| `src/features/student-experience/modules/StudentActivitiesView.tsx` | `src/pages/student/StudentActivitiesView.tsx` | 116 |
| `src/features/student-experience/modules/StudentBackpackView.tsx` | `src/pages/student/StudentBackpackView.tsx` | 616 |
| `src/features/student-experience/catalog/StudentCatalogView.tsx` | `src/pages/student/StudentCatalogView.tsx` | 229 |
| `src/features/student-experience/modules/StudentFamilyConversationsView.tsx` | `src/pages/student/StudentFamilyConversationsView.tsx` | 609 |
| `src/features/student-experience/modules/StudentJournalView.tsx` | `src/pages/student/StudentJournalView.tsx` | 753 |
| `src/features/student-experience/plans/StudentPlansView.tsx` | `src/pages/student/StudentPlansView.tsx` | 233 |
| `src/features/student-experience/profile/StudentProfileView.tsx` | `src/pages/student/StudentProfileView.tsx` | 251 |
| `src/features/student-experience/research/StudentResearchView.tsx` | `src/pages/student/StudentResearchView.tsx` | 314 |
| `src/features/student-experience/modules/StudentResourcesView.tsx` | `src/pages/student/StudentResourcesView.tsx` | 11 |
| `src/features/student-experience/StudentShell.tsx` | `src/pages/student/StudentShell.tsx` | 119 |
| `src/features/student-experience/modules/StudentSignalsView.tsx` | `src/pages/student/StudentSignalsView.tsx` | 203 |
| `src/features/student-experience/StudentThemeScope.tsx` | `src/pages/student/StudentThemeScope.tsx` | 11 |

## src/routes/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/routes/AppRoutes.tsx` | se queda | 245 |
| `src/features/student-experience/paths.ts` | `src/routes/discoveryPaths.ts` | 7 |
| `src/routes/paths.ts` | se queda | 69 |

## src/services/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/servidor/cliente.ts` | `src/services/api/cliente.ts` | 37 |

## src/store/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/occupation-exploration/lib/AdventureStore.ts` | `src/store/adventureStore.ts` | 317 |
| `src/features/student-experience/discovery/discoveryStore.ts` | `src/store/discoveryStore.ts` | 217 |
| `src/features/student-experience/discovery/explorationStore.ts` | `src/store/explorationStore.ts` | 184 |
| `src/features/missions/store.ts` | `src/store/journeyStore.ts` | 137 |
| `src/features/student-experience/reflection/store.ts` | `src/store/reflectionStore.ts` | 136 |
| `src/features/servidor/cuenta.ts` | `src/store/servidor/cuenta.ts` | 34 |
| `src/features/servidor/estadoServidor.ts` | `src/store/servidor/estadoServidor.ts` | 253 |
| `src/features/servidor/acciones.ts` | `src/store/servidor/operaciones.ts` | 181 |
| `src/features/student-experience/ui-state.ts` | `src/store/studentUiStore.ts` | 125 |

## src/styles/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/styles/Theme.css` | `src/styles/theme.css` | 734 |

## src/styles/student/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/occupation-exploration/adventure.css` | `src/styles/student/adventure.css` | 86 |
| `src/features/student-experience/discovery/discovery.css` | `src/styles/student/discovery.css` | 1264 |
| `src/features/student-experience/modules/history.css` | `src/styles/student/history.css` | 325 |
| `src/features/missions/journey.css` | `src/styles/student/journey.css` | 1104 |
| `src/features/student-experience/reflection/reflection.css` | `src/styles/student/reflection.css` | 214 |
| `src/features/occupation-exploration/resources.css` | `src/styles/student/resources.css` | 146 |
| `src/features/student-experience/student-experience.css` | `src/styles/student/student-experience.css` | 3681 |

## src/types/

| Origen | Destino | Líneas |
|---|---|---:|
| `src/features/missions/model.ts` | `src/types/activities.ts` | 323 |
| `src/features/occupation-exploration/types/AdventureTypes.ts` | `src/types/adventure.ts` | 96 |
| `src/features/occupation-exploration/types/ForestFireCaseTypes.ts` | `src/types/cases.ts` | 57 |
| `src/features/occupation-exploration/types/OccupationExplorationTypes.ts` | `src/types/catalog.ts` | 37 |
| `src/features/student-experience/challenges/model.ts` | `src/types/challenges.ts` | 43 |
| `src/features/occupation-exploration/types/StudentDecisionTypes.ts` | `src/types/decisions.ts` | 91 |
| `src/features/student-experience/reflection/model.ts` | `src/types/reflection.ts` | 58 |
| `src/features/servidor/tipos.ts` | `src/types/servidor.ts` | 177 |
| `src/features/counselor-portal/profile/types.ts` | `src/types/studentProfile.ts` | 113 |

## Se elimina (decisión D1)

| Origen | Destino | Líneas |
|---|---|---:|
| `src/assets/hero.png` | — | 53 |
| `src/assets/react.svg` | — | 1 |
| `src/assets/vite.svg` | — | 1 |
| `src/components/AdventureMap.tsx` | — | 287 |
| `src/components/MapPointDrawer.tsx` | — | 96 |
| `src/components/MetricCard.tsx` | — | 53 |
| `src/features/counselor-portal/ReviewInboxView.tsx` | — | 232 |
| `src/features/missions/JourneyPlayer.tsx` | — | 572 |
| `src/features/missions/JourneyRecord.tsx` | — | 332 |
| `src/features/missions/JourneyReview.tsx` | — | 117 |
| `src/features/occupation-exploration/AdventureAchievementsView.tsx` | — | 287 |
| `src/features/occupation-exploration/AdventureResourcesView.tsx` | — | 718 |
| `src/features/occupation-exploration/CityMapView.tsx` | — | 225 |
| `src/features/occupation-exploration/ExplorationCatalogView.tsx` | — | 560 |
| `src/features/occupation-exploration/ExplorationLevelView.tsx` | — | 1 |
| `src/features/occupation-exploration/ExplorationProfileView.tsx` | — | 269 |
| `src/features/occupation-exploration/FieldMissionsView.tsx` | — | 232 |
| `src/features/occupation-exploration/JournalSignalsView.tsx` | — | 188 |
| `src/features/occupation-exploration/JournalView.tsx` | — | 814 |
| `src/features/occupation-exploration/OccupationExplorationShell.tsx` | — | 203 |
| `src/features/occupation-exploration/ResearchMissionsView.tsx` | — | 225 |
| `src/features/occupation-exploration/TestimonialsView.tsx` | — | 175 |
| `src/features/occupation-exploration/components/AdventureModeSwitch.tsx` | — | 33 |
| `src/features/occupation-exploration/components/ExplorationProgressSummary.tsx` | — | 53 |
| `src/features/occupation-exploration/components/FieldActivities.tsx` | — | 604 |
| `src/features/occupation-exploration/components/ForestFireCaseTopBar.tsx` | — | 102 |
| `src/features/occupation-exploration/components/JournalResurfacing.tsx` | — | 60 |
| `src/features/occupation-exploration/components/PostActivityJournalSheet.tsx` | — | 158 |
| `src/features/occupation-exploration/components/StudentDecisionSection.tsx` | — | 1370 |
| `src/features/occupation-exploration/data/FieldMissionActivityData.ts` | — | 316 |
| `src/features/occupation-exploration/data/FieldMissionsData.ts` | — | 459 |
| `src/features/student-experience/modules/StudentResourceBoard.tsx` | — | 681 |

