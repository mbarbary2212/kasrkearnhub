import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTopic, useUpdateTopic } from '@/hooks/useTopicManagement';
import { Topic } from '@/types/database';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Topic name is required'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TopicFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  editingTopic?: Topic | null;
}

const GRADE_OPTIONS = [
  { value: 'INT 108', label: 'INT 108 – 1st Grade' },
  { value: 'INT 208', label: 'INT 208 – 2nd Grade' },
  { value: 'PAT 210', label: 'PAT 210 – 2nd Grade' },
  { value: 'PAT 310', label: 'PAT 310 – 3rd Grade' },
  { value: 'Practical', label: 'Practical Topics' },
];

export function TopicFormModal({
  open,
  onOpenChange,
  departmentId,
  editingTopic,
}: TopicFormModalProps) {
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const isEditing = !!editingTopic;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (editingTopic) {
      form.reset({
        name: editingTopic.name,
        description: editingTopic.description || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [editingTopic, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && editingTopic) {
        await updateTopic.mutateAsync({
          topicId: editingTopic.id,
          departmentId,
          data: {
            name: values.name,
            description: values.description || null,
          },
        });
        toast.success('Topic updated successfully');
      } else {
        await createTopic.mutateAsync({
          departmentId,
          name: values.name,
          description: values.description || null,
        });
        toast.success('Topic created successfully');
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(isEditing ? 'Failed to update topic' : 'Failed to create topic');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Topic' : 'Add Topic'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Introduction to medical pharmacology" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade / Course Code</FormLabel>
                  <Select 
                    value={field.value || ''} 
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GRADE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTopic.isPending || updateTopic.isPending}
              >
                {isEditing ? 'Update' : 'Create'} Topic
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
