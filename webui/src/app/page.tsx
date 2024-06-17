import JobSubmitForm from './clientComponents';
import submitNewPipelineJob from './serverActions';

export default async function Page() {
    return (
        <JobSubmitForm submitFn={submitNewPipelineJob}></JobSubmitForm>
    );
}
