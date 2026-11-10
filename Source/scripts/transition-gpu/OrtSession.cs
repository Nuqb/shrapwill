using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

// Public ONNX C ABI only; no Filmora algorithms or proprietary DLLs are loaded.
internal sealed class OrtSession : IDisposable
{
    [DllImport("onnxruntime.dll", CallingConvention=CallingConvention.Winapi)] static extern IntPtr OrtGetApiBase();
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr GetApi(uint version);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr ErrorMessage(IntPtr status);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr CreateEnv(int level,string name,out IntPtr env);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr CreateOptions(out IntPtr options);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr SetOption(IntPtr options,int value);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr EnvAction(IntPtr env);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr CreateSession(IntPtr env,[MarshalAs(UnmanagedType.LPWStr)]string file,IntPtr options,out IntPtr session);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr Count(IntPtr handle,out UIntPtr value);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr GetName(IntPtr session,UIntPtr index,IntPtr allocator,out IntPtr name);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr Allocator(out IntPtr allocator);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr Free(IntPtr allocator,IntPtr value);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr Memory(int allocatorType,int memoryType,out IntPtr info);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr Tensor(IntPtr memory,IntPtr data,UIntPtr length,long[] shape,UIntPtr dimensions,int type,out IntPtr tensor);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr RunModel(IntPtr session,IntPtr options,IntPtr[] names,IntPtr[] inputs,UIntPtr count,IntPtr[] outputNames,UIntPtr outputCount,[Out]IntPtr[] outputs);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate IntPtr GetPointer(IntPtr value,out IntPtr result);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] delegate void Release(IntPtr handle);
    static IntPtr api;
    IntPtr env,session,memory;
    IntPtr inputName;
    IntPtr[] outputNames;
    string[] names;

    static T Function<T>(int index)
    {
        if(api==IntPtr.Zero) {
            var get=(GetApi)(object)Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(OrtGetApiBase()),typeof(GetApi));
            api=get(20);
            if(api==IntPtr.Zero) throw new Exception("Unsupported local inference runtime");
        }
        return (T)(object)Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(api,index*IntPtr.Size),typeof(T));
    }
    static void Check(IntPtr status)
    {
        if(status==IntPtr.Zero)return;
        string error=Marshal.PtrToStringAnsi(Function<ErrorMessage>(OrtApiIndex.GetErrorMessage)(status));
        Function<Release>(OrtApiIndex.ReleaseStatus)(status);
        throw new Exception(error);
    }
    string Name(int method,int index,IntPtr allocator)
    {
        IntPtr value;
        Check(Function<GetName>(method)(session,(UIntPtr)(uint)index,allocator,out value));
        string result=Marshal.PtrToStringAnsi(value);
        Check(Function<Free>(OrtApiIndex.AllocatorFree)(allocator,value));
        return result;
    }
    public OrtSession(string file)
    {
        Check(Function<CreateEnv>(OrtApiIndex.CreateEnv)(2,"Shrapwill",out env));
        Check(Function<EnvAction>(OrtApiIndex.DisableTelemetryEvents)(env));
        IntPtr options;
        Check(Function<CreateOptions>(OrtApiIndex.CreateSessionOptions)(out options));
        try {
            Check(Function<SetOption>(OrtApiIndex.SetIntraOpNumThreads)(options,2));
            Check(Function<SetOption>(OrtApiIndex.SetInterOpNumThreads)(options,1));
            Check(Function<SetOption>(OrtApiIndex.SetSessionGraphOptimizationLevel)(options,99));
            Check(Function<CreateSession>(OrtApiIndex.CreateSession)(env,file,options,out session));
        } finally {Function<Release>(OrtApiIndex.ReleaseSessionOptions)(options);}
        Check(Function<Memory>(OrtApiIndex.CreateCpuMemoryInfo)(1,0,out memory));
        LoadNames();
    }
    void LoadNames()
    {
        IntPtr allocator;
        Check(Function<Allocator>(OrtApiIndex.GetAllocatorWithDefaultOptions)(out allocator));
        inputName=Marshal.StringToHGlobalAnsi(Name(OrtApiIndex.SessionGetInputName,0,allocator));
        UIntPtr count;
        Check(Function<Count>(OrtApiIndex.SessionGetOutputCount)(session,out count));
        if(count.ToUInt64()>32)throw new Exception("Invalid local model output count");
        outputNames=new IntPtr[(int)count.ToUInt64()];
        names=new string[outputNames.Length];
        for(int i=0;i<names.Length;i++) {
            names[i]=Name(OrtApiIndex.SessionGetOutputName,i,allocator);
            outputNames[i]=Marshal.StringToHGlobalAnsi(names[i]);
        }
    }
    float[] ReadTensor(IntPtr tensor)
    {
        IntPtr info,data;
        Check(Function<GetPointer>(OrtApiIndex.GetTensorTypeAndShape)(tensor,out info));
        try {
            UIntPtr count;
            Check(Function<Count>(OrtApiIndex.GetTensorShapeElementCount)(info,out count));
            if(count.ToUInt64()>4000000)throw new Exception("Local model output exceeded its bound");
            float[] result=new float[(int)count.ToUInt64()];
            Check(Function<GetPointer>(OrtApiIndex.GetTensorMutableData)(tensor,out data));
            Marshal.Copy(data,result,0,result.Length);
            return result;
        } finally {Function<Release>(OrtApiIndex.ReleaseTensorTypeAndShapeInfo)(info);}
    }
    public Dictionary<string,float[]> Run(float[] input,long[] shape)
    {
        var pinned=GCHandle.Alloc(input,GCHandleType.Pinned);
        IntPtr value=IntPtr.Zero;
        var outputs=new IntPtr[outputNames.Length];
        try {
            Check(Function<Tensor>(OrtApiIndex.CreateTensorWithDataAsOrtValue)(memory,pinned.AddrOfPinnedObject(),(UIntPtr)(ulong)(input.LongLength*4),shape,(UIntPtr)(uint)shape.Length,1,out value));
            Check(Function<RunModel>(OrtApiIndex.Run)(session,IntPtr.Zero,new IntPtr[]{inputName},new IntPtr[]{value},(UIntPtr)1,outputNames,(UIntPtr)(uint)outputs.Length,outputs));
            var result=new Dictionary<string,float[]>();
            for(int i=0;i<outputs.Length;i++)result[names[i]]=ReadTensor(outputs[i]);
            return result;
        } finally {
            foreach(var output in outputs)if(output!=IntPtr.Zero)Function<Release>(OrtApiIndex.ReleaseValue)(output);
            if(value!=IntPtr.Zero)Function<Release>(OrtApiIndex.ReleaseValue)(value);
            pinned.Free();
        }
    }
    public void Dispose()
    {
        if(inputName!=IntPtr.Zero)Marshal.FreeHGlobal(inputName);
        if(outputNames!=null)foreach(var name in outputNames)Marshal.FreeHGlobal(name);
        if(session!=IntPtr.Zero)Function<Release>(OrtApiIndex.ReleaseSession)(session);
        if(memory!=IntPtr.Zero)Function<Release>(OrtApiIndex.ReleaseMemoryInfo)(memory);
        if(env!=IntPtr.Zero)Function<Release>(OrtApiIndex.ReleaseEnv)(env);
        session=memory=env=inputName=IntPtr.Zero;
    }
}
