import { EventStatus } from "../../../generated/prisma/enums";

export interface CreateEventInput {
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  imageUrl?: string;
  organizerId?: string;
  status?: EventStatus;
  isFeatured?: boolean;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  eventDate?: string;
  location?: string;
  imageUrl?: string;
  status?: EventStatus;
  isFeatured?: boolean;
}

export interface ListEventsQuery {
  status?: EventStatus;
  search?: string;
  upcoming?: boolean;
  featured?: boolean;
  page?: number;
  limit?: number;
}
