import { EventAudience, EventStatus } from "../../../generated/prisma/enums";

export interface CreateEventInput {
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  imageUrl?: string;
  organizerId?: string;
  status?: EventStatus;
  isFeatured?: boolean;
  audience?: EventAudience;
  reunionBatchYear?: number;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  eventDate?: string;
  location?: string;
  imageUrl?: string;
  status?: EventStatus;
  isFeatured?: boolean;
  audience?: EventAudience;
  reunionBatchYear?: number | null;
}

export interface ListEventsQuery {
  status?: EventStatus;
  search?: string;
  upcoming?: boolean;
  featured?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}
