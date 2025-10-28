<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Activation Code</title>
</head>

<body
    style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 0; margin: 0;">
    <div
        style="max-width: 500px; margin: 40px auto; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
        <div style="background-color: #4F46E5; padding: 16px 24px; text-align: center;">
            <h2 style="color: white; margin: 0; font-size: 20px;">New Verification Code</h2>
        </div>

        <div style="padding: 24px;">
            <p style="font-size: 16px; color: #333;">Hello <strong>{{ $fullName }}</strong>,</p>
            <p style="font-size: 15px; color: #444;">Here is your new verification code to activate your account:</p>

            <div style="margin: 25px 0; text-align: center;">
                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px 0;">
                    <span style="font-size: 36px; font-weight: 700; color: #4F46E5; letter-spacing: 6px;">
                        {{ $codeId }}
                    </span>
                </div>
            </div>

            <p style="font-size: 14px; color: #444;">
                <strong>Note:</strong> This code is valid for
                <span style="color: red; font-weight: bold;">5 minutes</span> from the time this email was sent.
            </p>

            <p style="font-size: 13px; color: #777;">
                If you did not request this code, please ignore this email.
            </p>
        </div>
    </div>
</body>

</html>