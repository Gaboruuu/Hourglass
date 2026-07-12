async function createCode(codeData, baseUrl) {
  const response = await fetch(`${baseUrl}/codes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(codeData),
  });
  return response.json();
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(error.message);
  }
  const data = await response.json();
  return data;
}
