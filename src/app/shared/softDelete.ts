interface SoftDeletable {
  update: (args: { where: { id: string }; data: { isDeleted: boolean; deletedAt: Date } }) => Promise<unknown>;
}

export async function softDelete(model: SoftDeletable, id: string) {
  return model.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
}

export const SOFT_DELETED_WHERE = { isDeleted: false } as const;
