# Cloudflare R2 CORS Configuration

To allow your application to upload files to your Cloudflare R2 bucket, you need to configure the Cross-Origin Resource Sharing (CORS) policy for your bucket. Follow these steps:

1.  **Log in to your Cloudflare dashboard.**
2.  Navigate to the **R2** section from the left-hand sidebar.
3.  Select the bucket you are using for this application.
4.  Go to the **Settings** tab for your bucket.
5.  Scroll down to the **CORS** section and click **Add CORS policy**.
6.  Copy and paste the following JSON into the text area:

    ```json
    [
      {
        "AllowedOrigins": [
          "http://localhost:3000"
        ],
        "AllowedMethods": [
          "PUT",
          "GET",
          "HEAD"
        ],
        "AllowedHeaders": [
          "*"
        ],
        "ExposeHeaders": [
          "ETag"
        ],
        "MaxAgeSeconds": 3600
      }
    ]
    ```

7.  **Save** the CORS policy.

**Note:** If you deploy your application to a different domain, you will need to add that domain to the `AllowedOrigins` list as well. For example:

```json
"AllowedOrigins": [
  "http://localhost:3000",
  "https://your-production-domain.com"
]
```

After you have configured the CORS policy, please try uploading a file again.