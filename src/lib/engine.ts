export async function runInference(inputData: any): Promise<any> {
    console.log("Running mock inference on:", inputData);
    // Simulate inference delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
        success: true,
        mockResult: "Mock prediction result for input"
    };
}
