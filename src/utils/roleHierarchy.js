/**
 * Role Hierarchy and Creation Rules Matrix
 * Matches backend RoleHierarchyPolicy.java (auth-service)
 */

export const ROLE_DEFINITIONS = {
  TNP_SUPER_ADMIN: {
    label: 'TnP Super Admin',
    description: 'Trust-wide placement authority with full management rights',
    scope: 'TRUST',
  },
  IT_ADMIN: {
    label: 'IT Administrator',
    description: 'System administrator with destructive hard-delete permissions',
    scope: 'TRUST',
  },
  TNP_COLLEGE_ADMIN: {
    label: 'College TnP Admin',
    description: 'College-level Training and Placement Cell head',
    scope: 'COLLEGE',
  },
  TNP_COORDINATOR: {
    label: 'TnP Coordinator',
    description: 'College-level placement coordinator',
    scope: 'COLLEGE',
  },
  HOD: {
    label: 'Head of Department',
    description: 'Academic department head supervising placements & verification',
    scope: 'DEPARTMENT',
  },
  FACULTY_DEPT_COORDINATOR: {
    label: 'Faculty Dept Coordinator',
    description: 'Departmental faculty placement coordinator',
    scope: 'DEPARTMENT',
  },
  GROUND_VOLUNTEER: {
    label: 'Ground Volunteer',
    description: 'Drive execution and logistics volunteer',
    scope: 'COLLEGE',
  },
  STUDENT: {
    label: 'Student Candidate',
    description: 'Placement candidate',
    scope: 'DEPARTMENT',
  },
};

export const HIERARCHY_PERMISSIONS = {
  TNP_SUPER_ADMIN: [
    { value: 'TNP_COLLEGE_ADMIN', label: 'College Admin (TNP_COLLEGE_ADMIN)', collegeScoped: true, deptScoped: false },
    { value: 'HOD', label: 'Head of Department (HOD)', collegeScoped: true, deptScoped: true },
    { value: 'IT_ADMIN', label: 'IT Admin (IT_ADMIN)', collegeScoped: false, deptScoped: false },
    { value: 'TNP_SUPER_ADMIN', label: 'TnP Super Admin (TNP_SUPER_ADMIN)', collegeScoped: false, deptScoped: false },
  ],
  IT_ADMIN: [
    { value: 'TNP_COLLEGE_ADMIN', label: 'College Admin (TNP_COLLEGE_ADMIN)', collegeScoped: true, deptScoped: false },
    { value: 'TNP_COORDINATOR', label: 'TnP Coordinator (TNP_COORDINATOR)', collegeScoped: true, deptScoped: false },
    { value: 'GROUND_VOLUNTEER', label: 'Ground Volunteer (GROUND_VOLUNTEER)', collegeScoped: true, deptScoped: false },
    { value: 'HOD', label: 'Head of Department (HOD)', collegeScoped: true, deptScoped: true },
    { value: 'FACULTY_DEPT_COORDINATOR', label: 'Faculty Dept Coordinator (FACULTY_DEPT_COORDINATOR)', collegeScoped: true, deptScoped: true },
    { value: 'STUDENT', label: 'Student Candidate (STUDENT)', collegeScoped: true, deptScoped: true },
    { value: 'TNP_SUPER_ADMIN', label: 'TnP Super Admin (TNP_SUPER_ADMIN)', collegeScoped: false, deptScoped: false },
    { value: 'IT_ADMIN', label: 'IT Admin (IT_ADMIN)', collegeScoped: false, deptScoped: false },
  ],
  TNP_COLLEGE_ADMIN: [
    { value: 'TNP_COORDINATOR', label: 'TnP Coordinator (TNP_COORDINATOR)', collegeScoped: true, deptScoped: false },
    { value: 'HOD', label: 'Head of Department (HOD)', collegeScoped: true, deptScoped: true },
  ],
  TNP_COORDINATOR: [
    { value: 'HOD', label: 'Head of Department (HOD)', collegeScoped: true, deptScoped: true },
    { value: 'GROUND_VOLUNTEER', label: 'Ground Volunteer (GROUND_VOLUNTEER)', collegeScoped: true, deptScoped: false },
  ],
  HOD: [
    { value: 'FACULTY_DEPT_COORDINATOR', label: 'Faculty Dept Coordinator (FACULTY_DEPT_COORDINATOR)', collegeScoped: true, deptScoped: true },
    { value: 'STUDENT', label: 'Student Candidate (STUDENT)', collegeScoped: true, deptScoped: true },
  ],
  FACULTY_DEPT_COORDINATOR: [
    { value: 'STUDENT', label: 'Student Candidate (STUDENT)', collegeScoped: true, deptScoped: true },
  ],
};

export function getAllowedTargetRoles(currentRole) {
  return HIERARCHY_PERMISSIONS[currentRole] || [];
}
