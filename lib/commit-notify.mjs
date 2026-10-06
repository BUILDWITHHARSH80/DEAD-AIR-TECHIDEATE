export async function commitThenNotify(commit, notify) {
  const result = await commit();
  await notify(result);
  return result;
}
