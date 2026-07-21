export interface SendConnectionRequestInput {
  receiverId: string;
  note?: string;
}

export interface ReviewConnectionInput {
  connectionId: string;
  status: "ACCEPTED" | "REJECTED";
}

export interface BlockUserInput {
  blockedId: string;
}

export interface AddSkillInput {
  tagId: string;
}

export interface SearchPeopleQuery {
  query?: string;
  department?: string;
  semester?: string;
  skills?: string[];
  page?: number;
  limit?: number;
}

export interface GetMyConnectionsQuery {
  filter?: "ALL" | "SENIORS" | "JUNIORS" | "SAME_SEMESTER" | "FAVORITES";
  page?: number;
  limit?: number;
}

export interface ConnectionWithUser {
  id: string;
  requesterId: string;
  receiverId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";
  isFavorite: boolean;
  note?: string | null;
  createdAt: Date;
  updatedAt: Date;
  otherUser: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    student: {
      department: string;
      admissionYear: number;
      admissionSemester: string;
    } | null;
    profile: {
      currentSemester: number | null;
      batchYear: number | null;
    } | null;
  };
}

export interface SuggestedPerson {
  id: string;
  name: string;
  email: string;
  image: string | null;
  department: string;
  currentSemester: number | null;
  mutualConnections: number;
  score: number;
}
