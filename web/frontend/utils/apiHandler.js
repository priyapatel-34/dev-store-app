export const handleApiResponse = async (
    response,
    showToast,
    successMessage = "Success"
  ) => {
    let data = {};
  
    try {
      data = await response.json();
    } catch (err) {
      showToast("Invalid server response", true);
      return null;
    }
  
    if (response.ok && data.success) {
      showToast(data.message || successMessage);
      return data;
    } else {
      showToast(
        data.error || data.message || "Something went wrong",
        true
      );
      return null;
    }
  };