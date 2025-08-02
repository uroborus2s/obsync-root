import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { showSubmittedData } from '@/utils/show-submitted-data';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator, } from '@/components/ui/input-otp';
const formSchema = z.object({
    otp: z.string().min(1, { message: 'Please enter your otp code.' }),
});
export function OtpForm({ className, ...props }) {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: { otp: '' },
    });
    const otp = form.watch('otp');
    function onSubmit(data) {
        setIsLoading(true);
        showSubmittedData(data);
        setTimeout(() => {
            setIsLoading(false);
            navigate({ to: '/' });
        }, 1000);
    }
    return (<Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('grid gap-2', className)} {...props}>
        <FormField control={form.control} name='otp' render={({ field }) => (<FormItem>
              <FormLabel className='sr-only'>One-Time Password</FormLabel>
              <FormControl>
                <InputOTP maxLength={6} {...field} containerClassName='justify-between sm:[&>[data-slot="input-otp-group"]>div]:w-12'>
                  <InputOTPGroup>
                    <InputOTPSlot index={0}/>
                    <InputOTPSlot index={1}/>
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={2}/>
                    <InputOTPSlot index={3}/>
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={4}/>
                    <InputOTPSlot index={5}/>
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>)}/>
        <Button className='mt-2' disabled={otp.length < 6 || isLoading}>
          Verify
        </Button>
      </form>
    </Form>);
}
//# sourceMappingURL=otp-form.js.map